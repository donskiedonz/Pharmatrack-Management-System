// testforecast.js
// ====================
// PharmaTrack: Daily Forecast Test
// ====================

import { exec } from "child_process";
import path from "path";

// Path to your R script
const rScriptPath = path.join(
  "C:",
  "Users",
  "Pharmatrack",
  "Pharmacy-management",
  "forecast_sales.R"
);

console.log("=== Daily Forecast Test ===\n");

// Run Rscript
exec(`"C:\\Program Files\\R\\R-4.5.2\\bin\\Rscript.exe" "${rScriptPath}"`, (error, stdout, stderr) => {
  if (error) {
    console.error("R execution error:", error.message);
    return;
  }
  if (stderr) {
    console.warn("R stderr:", stderr);
  }

  try {
    // Parse JSON output
    const forecastData = JSON.parse(stdout);
    if (forecastData.length === 0) {
      console.log("No forecast data available. Not enough historical sales?");
    } else {
      console.log("Product | Predicted Sales (Next Day)");
      console.log("-------------------------------------");
      forecastData.forEach(item => {
        console.log(`${item.product} | ${item.predicted_sales_next_week}`);
      });
    }
  } catch (e) {
    console.error("Failed to parse R JSON output:", e.message);
    console.log("Raw R output:\n", stdout);
  }
});
