// ==========================
// PharmaTrack Dashboard JS (Enhanced & Fully Dynamic AI Stock Forecast)
// ==========================

// ===== User Role =====
const role = sessionStorage.getItem('userRole') || 'pharmacist';
document.getElementById('userRoleDisplay').textContent = `Logged in as ${role}`;

// ===== Hide Admin-Only Elements =====
if (role !== 'admin') {
  document.querySelectorAll('.sidebar-menu li a[href="users.html"], .sidebar-menu li a[href="settings.html"]')
    .forEach(a => a.style.display = 'none');

  document.querySelectorAll('.shortcut-btn')
    .forEach(btn => {
      const href = btn.getAttribute('onclick');
      if (href.includes('users.html') || href.includes('settings.html')) btn.style.display = 'none';
    });
}

// ===== Live Date & Time =====
function updateDateTime() {
  const now = new Date();
  const options = { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  };
  document.getElementById('liveDateTime').textContent = now.toLocaleDateString('en-US', options);
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ===== Fetch Data Utility =====
async function fetchData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Error fetching ${url}:`, err);
    return [];
  }
}

// API Endpoints
const fetchProducts = () => fetchData('/api/products');
const fetchSales = () => fetchData('/api/sales');
const fetchFutureSales = () => fetchData('/api/predict-sales');

// ===== Chart Modal =====
const chartModal = document.getElementById('chartModal');
const chartModalClose = document.getElementById('chartModalClose');
const chartModalTitle = document.getElementById('chartModalTitle');
const chartModalCanvas = document.getElementById('chartModalCanvas');
let modalChartInstance = null;

function openChartModal(title, chartInstance) {
  chartModalTitle.textContent = title;

  if (modalChartInstance) modalChartInstance.destroy();

  const ctx = chartModalCanvas.getContext('2d');
  modalChartInstance = new Chart(ctx, {
    type: chartInstance.config.type,
    data: JSON.parse(JSON.stringify(chartInstance.data)),
    options: { ...chartInstance.options, responsive: true, maintainAspectRatio: false }
  });

  chartModal.style.display = 'block';
}

chartModalClose.onclick = () => chartModal.style.display = 'none';
window.onclick = (e) => { if (e.target === chartModal) chartModal.style.display = 'none'; };

// ===== Render Dashboard =====
async function renderDashboard() {
  const [products, sales, futureSalesRaw] = await Promise.all([
    fetchProducts(),
    fetchSales(),
    fetchFutureSales()
  ]);

  // ---------- Deduplicate futureSales by product ----------
  const futureSales = [];
  const seenProducts = new Set();
  futureSalesRaw.forEach(f => {
    if (!seenProducts.has(f.product)) {
      seenProducts.add(f.product);
      f.current_stock = Array.isArray(f.current_stock) ? f.current_stock[0] : f.current_stock;

      // --------- Sanitize AI forecast data ---------
      if (f.predicted_stock_by_day?.length) {
        f.predicted_stock_by_day = f.predicted_stock_by_day.map(d => ({
          date: d.date,
          predicted_stock: Math.max(0, d.predicted_stock)
        }));
      }

      if (f.daily_forecast?.length) {
        f.daily_forecast = f.daily_forecast.map(d => ({
          date: d.date,
          predicted_sales: Math.max(0, d.predicted_sales)
        }));
      }

      futureSales.push(f);
    }
  });

  // ------------------ CARDS ------------------
  const cardsSection = document.getElementById('cardsSection');
  cardsSection.innerHTML = '';
  const cardsData = [
    { title: 'Total Products', value: products.length },
    { title: 'Low Stock', value: products.filter(p => p.quantity < 10).length },
    { title: 'Total Sales', value: sales.reduce((acc, s) => acc + (s.quantity || 0), 0) },
    { title: 'AI Restock Needed', value: futureSales.filter(f => f.suggested_restock > 0).length }
  ];
  cardsData.forEach(c => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.innerHTML = `<h3>${c.title}</h3><p>${c.value}</p>`;
    cardsSection.appendChild(card);
  });

  // ------------------ LOW STOCK ALERTS ------------------
  const lowStockList = document.getElementById('lowStockList');
  lowStockList.innerHTML = '';
  let lowStockFound = false;
  products.forEach(p => {
    const forecast = futureSales.find(f => f.product === p.name);
    if (forecast && forecast.suggested_restock > 0) {
      const li = document.createElement('li');
      li.textContent = `${p.name} may run low in next days (Predicted stock: ${forecast.predicted_stock_by_day.slice(-1)[0].predicted_stock})`;
      lowStockList.appendChild(li);
      lowStockFound = true;
    }
  });
  if (!lowStockFound) lowStockList.innerHTML = '<li>No low stock predicted in next days</li>';

  // ------------------ SMART RESTOCK ALERTS ------------------
  const restockList = document.getElementById('restockList');
  restockList.innerHTML = '';
  futureSales.forEach(f => {
    if (f.suggested_restock > 0) {
      const li = document.createElement('li');
      li.textContent = `Restock ${f.product} by ${f.suggested_restock} units (Current stock: ${f.current_stock})`;
      restockList.appendChild(li);
    }
  });
  if (restockList.innerHTML === '') {
    const li = document.createElement('li');
    li.textContent = 'No restock needed at the moment';
    restockList.appendChild(li);
  }

  // ------------------ STOCK CHART ------------------
  const stockCtx = document.getElementById('stockChart').getContext('2d');
  if (window.stockChartInstance) window.stockChartInstance.destroy();
  window.stockChartInstance = new Chart(stockCtx, {
    type: 'bar',
    data: {
      labels: products.map(p => p.name),
      datasets: [
        { label: 'Current Stock', data: products.map(p => p.quantity), backgroundColor: '#80b192' },
        { 
          label: 'Predicted Stock (Last Forecast Day)', 
          data: products.map(p => {
            const f = futureSales.find(fs => fs.product === p.name);
            return f?.predicted_stock_by_day?.length
              ? f.predicted_stock_by_day[f.predicted_stock_by_day.length - 1].predicted_stock
              : p.quantity;
          }),
          backgroundColor: '#ffcc80' 
        }
      ]
    },
    options: { responsive: true }
  });

  // ------------------ DAILY SALES FORECAST CHART ------------------
  const salesCtx = document.getElementById('salesChart').getContext('2d');
  if (window.salesChartInstance) window.salesChartInstance.destroy();

  let dailyLabels = [];
  if (futureSales.length > 0 && futureSales[0].daily_forecast?.length) {
    dailyLabels = futureSales[0].daily_forecast.map(d => d.date);
  }

  const predictedSalesDatasets = futureSales.map(f => ({
    label: f.product,
    data: f.daily_forecast?.map(d => Math.max(0, d.predicted_sales)) || [],
    borderColor: getRandomColor(),
    borderDash: [5, 3],
    fill: false
  }));

  window.salesChartInstance = new Chart(salesCtx, {
    type: 'line',
    data: { labels: dailyLabels, datasets: predictedSalesDatasets },
    options: {
      responsive: true,
      plugins: { legend: { display: true }, tooltip: { mode: 'index', intersect: false } },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: { y: { beginAtZero: true }, x: { title: { display: true, text: 'Date' } } }
    }
  });

  // ------------------ Make Charts Clickable ------------------
  document.querySelectorAll('.chart-box').forEach(box => {
    box.style.cursor = 'pointer';
    box.addEventListener('click', () => {
      const canvas = box.querySelector('canvas');
      const chartInstance = Chart.getChart(canvas);
      const title = box.querySelector('h3').textContent;
      if (chartInstance) openChartModal(title, chartInstance);
    });
  });

  // ------------------ AI Forecast Message ------------------
  if (!futureSales.length) {
    const msg = document.createElement('p');
    msg.textContent = 'AI forecast unavailable: not enough historical sales data.';
    msg.style.color = '#d9534f';
    msg.style.fontStyle = 'italic';
    document.querySelector('.alerts-section .alert-box:last-child').appendChild(msg);
  }
}

// ===== Helper for Random Colors =====
function getRandomColor() {
  const r = Math.floor(Math.random() * 200 + 30);
  const g = Math.floor(Math.random() * 200 + 30);
  const b = Math.floor(Math.random() * 200 + 30);
  return `rgb(${r},${g},${b})`;
}

document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const menuDropdown = document.getElementById('menuDropdown');

  menuToggle.addEventListener('click', e => {
    e.stopPropagation();
    menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', e => {
    if (!menuDropdown.contains(e.target) && !menuToggle.contains(e.target)) {
      menuDropdown.style.display = 'none';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
});

// ===== Initial Load =====
renderDashboard();
