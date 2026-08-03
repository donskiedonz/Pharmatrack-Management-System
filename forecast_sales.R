# ===============================
# PharmaTrack: Sales Forecast Script
# ===============================

# Set custom library path
.libPaths("C:/R/personal-library")

# Load required libraries
suppressPackageStartupMessages({
  library(DBI)
  library(RMySQL)
  library(prophet)
  library(jsonlite)
})

# --- Connect to MySQL ---
con <- dbConnect(
  RMySQL::MySQL(),
  dbname = "pharmatrack",
  host = "localhost",
  user = "root",
  password = "BLcivicom1*"
)

# --- Forecast settings ---
forecast_days <- 7         # Number of days to forecast
safe_stock_threshold <- 50 # Minimum desired stock

# --- Get list of products and their current stock ---
products <- dbGetQuery(con, "
  SELECT product, SUM(quantity) AS current_stock
  FROM sales
  GROUP BY product
")

# Initialize results list
result <- list()

# --- Loop through products and forecast ---
for (p in products$product) {

  # Fetch historical sales for product
  df <- dbGetQuery(con, sprintf(
    "SELECT date AS ds, quantity AS y FROM sales WHERE product='%s' ORDER BY date",
    p
  ))

  # Skip if not enough data
  if (nrow(df) < 2) next

  # Ensure date column is Date type
  df$ds <- as.Date(df$ds)

  # Forecast with Prophet
  forecast_data <- tryCatch({

    m <- suppressWarnings(prophet(
      df,
      weekly.seasonality = TRUE,
      daily.seasonality = TRUE,
      yearly.seasonality = FALSE
    ))

    future <- make_future_dataframe(m, periods = forecast_days)
    forecast <- predict(m, future)

    # Current stock
    current_stock <- products$current_stock[products$product == p]

    # Predicted stock for each day
    predicted_stock_by_day <- lapply(1:forecast_days, function(i) {
      predicted_sales <- max(round(forecast$yhat[nrow(df) + i]), 0)
      remaining_stock <- max(current_stock - sum(sapply(1:i, function(j) {
        max(round(forecast$yhat[nrow(df)+j]), 0)
      })), 0)
      list(
        date = as.character(future$ds[nrow(df) + i]),
        predicted_stock = remaining_stock
      )
    })

    # Suggested restock to reach safe stock
    last_day_stock <- predicted_stock_by_day[[forecast_days]]$predicted_stock
    suggested_restock <- max(safe_stock_threshold - last_day_stock, 0)

    # Daily forecast cleaned for negative sales
    daily_forecast <- lapply(1:forecast_days, function(i) {
      predicted_sales <- max(round(forecast$yhat[nrow(df)+i]), 0)
      list(
        date = as.character(future$ds[nrow(df) + i]),
        predicted_sales = predicted_sales
      )
    })

    list(
      product = p,
      current_stock = current_stock,
      predicted_stock_by_day = predicted_stock_by_day,
      suggested_restock = suggested_restock,
      daily_forecast = daily_forecast
    )

  }, error = function(e) {
    message(sprintf("Forecast failed for %s: %s", p, e$message))
    NULL
  })

  # Add to results if forecast succeeded
  if (!is.null(forecast_data)) {
    result[[length(result) + 1]] <- forecast_data
  }
}

# --- Output JSON ---
cat(toJSON(result, auto_unbox = TRUE), "\n")

# Disconnect from DB and exit
invisible(dbDisconnect(con))
quit(save = "no", status = 0, runLast = FALSE)
