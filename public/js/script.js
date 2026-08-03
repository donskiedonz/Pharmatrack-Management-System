// Select elements
const medicineForm = document.getElementById('medicine-form');
const medicineTable = document.getElementById('medicine-table');
const searchInput = document.getElementById('search');

let medicines = JSON.parse(localStorage.getItem('medicines')) || [];

// Display medicines
function displayMedicines(filtered = medicines) {
  medicineTable.innerHTML = '';
  filtered.forEach((med, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${med.name}</td>
      <td>${med.category}</td>
      <td>${med.quantity}</td>
      <td>${med.price}</td>
      <td>${med.expiry}</td>
      <td>
        <button class="edit" onclick="editMedicine(${index})">Edit</button>
        <button class="delete" onclick="deleteMedicine(${index})">Delete</button>
      </td>
    `;
    medicineTable.appendChild(row);
  });
}

// Add medicine
medicineForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newMed = {
    name: document.getElementById('name').value,
    category: document.getElementById('category').value,
    quantity: parseInt(document.getElementById('quantity').value),
    price: parseFloat(document.getElementById('price').value),
    expiry: document.getElementById('expiry').value,
    salesHistory: [] // optional for AI forecast later
  };
  medicines.push(newMed);
  localStorage.setItem('medicines', JSON.stringify(medicines));
  medicineForm.reset();
  displayMedicines();
});

// Delete medicine
function deleteMedicine(index) {
  if(confirm('Are you sure you want to delete this medicine?')) {
    medicines.splice(index,1);
    localStorage.setItem('medicines', JSON.stringify(medicines));
    displayMedicines();
  }
}

// Edit medicine
function editMedicine(index) {
  const med = medicines[index];
  document.getElementById('name').value = med.name;
  document.getElementById('category').value = med.category;
  document.getElementById('quantity').value = med.quantity;
  document.getElementById('price').value = med.price;
  document.getElementById('expiry').value = med.expiry;
  medicines.splice(index,1); // remove old entry
  displayMedicines();
}

// Search / filter
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();
  const filtered = medicines.filter(med => med.name.toLowerCase().includes(query) || med.category.toLowerCase().includes(query));
  displayMedicines(filtered);
});

// Initial display
displayMedicines();


// Predict days until stock runs out
function predictRestock(med) {
  if (!med.salesHistory || med.salesHistory.length === 0) return Infinity;

  const avgDailySales = med.salesHistory.reduce((a,b)=>a+b,0) / med.salesHistory.length;
  if (avgDailySales === 0) return Infinity;

  const daysLeft = med.quantity / avgDailySales;
  return Math.ceil(daysLeft);
}

// Generate forecast for next N days
function generateForecast(med, days = 7) {
  if (!med.salesHistory || med.salesHistory.length === 0) return Array(days).fill(0);
  const avgDailySales = med.salesHistory.reduce((a,b)=>a+b,0)/med.salesHistory.length;
  const forecast = [];
  let remainingStock = med.quantity;
  for (let i=0;i<days;i++) {
    forecast.push(Math.min(avgDailySales, remainingStock));
    remainingStock -= avgDailySales;
  }
  return forecast;
}

const daysLeft = predictRestock(med);
row.style.backgroundColor = daysLeft <= 3 ? '#f8d7da' : ''; // highlight red if stock < 3 days


let forecastChart;

function renderForecastChart(med) {
  const ctx = document.getElementById('forecastChart').getContext('2d');
  const forecast = generateForecast(med, 7);
  const labels = Array.from({length:7}, (_,i)=>`Day ${i+1}`);
  
  if (forecastChart) forecastChart.destroy();

  forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `${med.name} Stock Forecast`,
        data: forecast,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Example: show forecast for first medicine
if(medicines.length>0) renderForecastChart(medicines[0]);


// Section switching
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(sec => sec.style.display='none');
  document.getElementById(sectionId).style.display='block';
}

// Demo Data
const products = [
  {name:'Paracetamol', category:'Painkiller', quantity:50, price:2.5, expiry:'2025-12-15'},
  {name:'Amoxicillin', category:'Antibiotic', quantity:30, price:5, expiry:'2025-11-30'},
];

const categories = [
  {name:'Painkiller', description:'Pain relieving medicines'},
  {name:'Antibiotic', description:'Infection fighting medicines'}
];

const suppliers = [
  {name:'Supplier A', contact:'09123456789', address:'Manila'},
  {name:'Supplier B', contact:'09987654321', address:'Cebu'}
];

const purchases = [
  {product:'Paracetamol', supplier:'Supplier A', quantity:20, price:2.5, date:'2025-11-30'}
];

const sales = [
  {product:'Paracetamol', quantity:5, price:2.5, date:'2025-12-01'}
];

// Render Tables
function renderTable(id, data, fields) {
  const tbody = document.getElementById(id);
  tbody.innerHTML = '';
  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = fields.map(f=>`<td>${item[f]}</td>`).join('');
    tbody.appendChild(tr);
  });
}

renderTable('products-table', products, ['name','category','quantity','price','expiry']);
renderTable('categories-table', categories, ['name','description']);
renderTable('suppliers-table', suppliers, ['name','contact','address']);
renderTable('purchases-table', purchases, ['product','supplier','quantity','price','date']);
renderTable('sales-table', sales, ['product','quantity','price','date']);

// Dashboard Stats
document.getElementById('total-products').innerText = products.length;
document.getElementById('low-stock').innerText = products.filter(p=>p.quantity<10).length;
document.getElementById('total-sales').innerText = sales.reduce((a,b)=>a+b.quantity,0);

// Chart.js Stock Chart
const ctx = document.getElementById('stockChart').getContext('2d');
new Chart(ctx, {
  type:'bar',
  data:{
    labels: products.map(p=>p.name),
    datasets:[{
      label:'Stock Quantity',
      data: products.map(p=>p.quantity),
      backgroundColor:'rgba(75,192,192,0.6)'
    }]
  },
  options:{ responsive:true, scales:{ y:{ beginAtZero:true } } }
});
