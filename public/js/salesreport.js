document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- User Role ---------------- */
  const role = sessionStorage.getItem("userRole") || "admin";
  const roleEl = document.getElementById("userRoleDisplay");
  if (roleEl) roleEl.textContent = `Logged in as ${role}`;

  /* ---------------- State ---------------- */
  let sales = [];
  let filteredSales = [];
  let chart = null;
  let currentPeriod = "daily";

  /* ---------------- Init ---------------- */
  fetchSales();

  /* ---------------- Date Formatter ---------------- */
  function formatDateFriendly(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;

    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  /* ---------------- Fetch ---------------- */
  function fetchSales() {
    fetch("http://localhost:3000/api/sales")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch sales");
        return res.json();
      })
      .then(data => {
        sales = Array.isArray(data)
          ? data.map(s => {
              const quantity = Number(s.quantity) || 0;
              const price = Number(s.price) || 0;
              const total = Number(s.total) || (quantity * price);
              return { ...s, quantity, price, total };
            })
          : [];
        populateProducts();
        applyFilters();
      })
      .catch(err => console.error("Sales fetch error:", err));
  }

  /* ---------------- Events ---------------- */
  document.getElementById("applyFilterBtn")?.addEventListener("click", applyFilters);
  document.getElementById("exportCsvBtn")?.addEventListener("click", exportCSV);

  document.querySelectorAll(".period-filter button").forEach(btn => {
    btn.addEventListener("click", () => {
      currentPeriod = btn.dataset.period;
      renderReport();
      renderChart();
    });
  });

  /* ---------------- Filters ---------------- */
  function applyFilters() {
    const start = document.getElementById("startDate")?.value;
    const end = document.getElementById("endDate")?.value;
    const product = document.getElementById("productFilter")?.value;
    const search = document.getElementById("searchInput")?.value.toLowerCase() || "";

    filteredSales = sales.filter(s =>
      (!start || s.date >= start) &&
      (!end || s.date <= end) &&
      (!product || s.product === product) &&
      (!search || s.product.toLowerCase().includes(search))
    );

    renderSummary();
    renderReport();
    renderChart();
  }

  /* ---------------- Summary ---------------- */
  function renderSummary() {
    const sumTransactions = document.getElementById("sumTransactions");
    const sumSales = document.getElementById("sumSales");
    const sumTopProduct = document.getElementById("sumTopProduct");
    const sumBestDay = document.getElementById("sumBestDay");

    if (!sumTransactions) return;

    sumTransactions.textContent = filteredSales.length;

    const totalSales = filteredSales.reduce((s, r) => s + r.total, 0);
    sumSales.textContent = `₱${totalSales.toFixed(2)}`;

    const productMap = {};
    const dayMap = {};

    filteredSales.forEach(s => {
      productMap[s.product] = (productMap[s.product] || 0) + s.quantity;
      dayMap[s.date] = (dayMap[s.date] || 0) + s.total;
    });

    sumTopProduct.textContent =
      Object.keys(productMap).sort((a, b) => productMap[b] - productMap[a])[0] || "-";

    const bestDayRaw =
      Object.keys(dayMap).sort((a, b) => dayMap[b] - dayMap[a])[0];

    sumBestDay.textContent = bestDayRaw
      ? formatDateFriendly(bestDayRaw)
      : "-";
  }

  /* ---------------- Grouping ---------------- */
  function groupByPeriod() {
    const map = {};

    filteredSales.forEach(s => {
      const key =
        currentPeriod === "monthly" ? s.date.slice(0, 7) :
        currentPeriod === "weekly" ? getWeek(s.date) :
        s.date;

      if (!map[key]) map[key] = [];
      map[key].push(s);
    });

    return map;
  }

  /* ---------------- Report ---------------- */
  function renderReport() {
    const tbody = document.getElementById("reportTable");
    if (!tbody) return;

    tbody.innerHTML = "";
    const grouped = groupByPeriod();

    Object.keys(grouped).sort().forEach(period => {
      const rows = grouped[period];

      const revenue = rows.reduce((s, r) => s + r.total, 0);
      const items = rows.reduce((s, r) => s + r.quantity, 0);

      const productCount = {};
      rows.forEach(r => {
        productCount[r.product] = (productCount[r.product] || 0) + r.quantity;
      });

      const topProduct =
        Object.keys(productCount).sort((a, b) => productCount[b] - productCount[a])[0] || "-";

      const displayPeriod =
        currentPeriod === "daily"
          ? formatDateFriendly(period)
          : currentPeriod === "monthly"
          ? new Date(period + "-01").toLocaleDateString("en-US", {
              year: "numeric",
              month: "long"
            })
          : period;

      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${displayPeriod}</td>
          <td>${rows.length}</td>
          <td>${items}</td>
          <td class="revenue">₱${revenue.toFixed(2)}</td>
          <td class="top-product">${topProduct}</td>
        </tr>
      `);
    });
  }

  /* ---------------- Chart ---------------- */
  function renderChart() {
    const canvas = document.getElementById("salesChart");
    if (!canvas || typeof Chart === "undefined") return;

    const grouped = groupByPeriod();
    const labels = Object.keys(grouped).sort();
    const data = labels.map(l =>
      grouped[l].reduce((s, r) => s + r.total, 0)
    );

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Sales",
          data,
          borderWidth: 2,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }

  /* ---------------- CSV ---------------- */
  function exportCSV() {
    let csv = "Date,Product,Quantity,Price,Total\n";
    filteredSales.forEach(s => {
      csv += `${formatDateFriendly(s.date)},${s.product},${s.quantity},${s.price},${s.total}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sales_report.csv";
    a.click();
  }

  /* ---------------- Helpers ---------------- */
  function populateProducts() {
    const select = document.getElementById("productFilter");
    if (!select) return;

    select.innerHTML = `<option value="">All Products</option>`;
    [...new Set(sales.map(s => s.product))].forEach(p => {
      select.insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`);
    });
  }

  function getWeek(date) {
    const d = new Date(date);
    const first = new Date(d.getFullYear(), 0, 1);
    return `Week ${Math.ceil((((d - first) / 86400000) + first.getDay() + 1) / 7)}`;
  }

  /* ---------------- Live Date/Time ---------------- */
  function updateDateTime() {
    const now = new Date();
    const el = document.getElementById("liveDateTime");
    if (el) {
      el.textContent = now.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }
  }
  setInterval(updateDateTime, 1000);
  updateDateTime();

});
