// ===========================
// suppliers.js
// ===========================

// --------------------------
// User Role & Header UI
// --------------------------
const role = sessionStorage.getItem('userRole') || 'admin';
document.getElementById('userRoleDisplay').textContent = `Logged in as ${role}`;

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

// --------------------------
// Live Date & Time
// --------------------------
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

// --------------------------
// DOM Elements
// --------------------------
const tableBody = document.getElementById('suppliers-table');
const addBtn = document.getElementById('addSupplierBtn');
const modal = document.getElementById('supplierModal');
const closeModal = modal.querySelector('.close');
const form = document.getElementById('supplierForm');
const modalTitle = document.getElementById('modalTitle');
const supplierIndexInput = document.getElementById('supplierIndex');
const categorySelect = document.getElementById('supplierCategory');
const searchInput = document.getElementById('searchInput');
const reorderTableBody = document.getElementById('reorderTable');
const orderHistoryTableBody = document.getElementById('orderHistoryTable');

// Hide add button for non-admin
if (role !== 'admin') addBtn.style.display = 'none';

// --------------------------
// Data Stores
// --------------------------
let suppliers = [];
let categories = [];
let reorders = [];
let orderHistory = [];

// --------------------------
// Fetch Functions
// --------------------------
async function fetchCategories() {
  try {
    const res = await fetch('http://localhost:3000/api/categories');
    categories = await res.json();

    categorySelect.innerHTML = `<option value="">-- Select Category --</option>`;
    categories.forEach(c => {
      categorySelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  } catch (err) {
    console.error('Fetch Categories Error:', err);
  }
}

async function fetchSuppliers() {
  try {
    const res = await fetch('http://localhost:3000/api/suppliers');
    suppliers = await res.json();
    renderSuppliers();
  } catch (err) {
    console.error('Fetch Suppliers Error:', err);
  }
}

async function fetchReorders() {
  try {
    const res = await fetch('http://localhost:3000/api/reorders');
    reorders = await res.json();
    renderReorders();
  } catch (err) {
    console.error('Fetch Reorders Error:', err);
    reorderTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No reorders available</td></tr>`;
  }
}

async function fetchOrderHistory() {
  try {
    const res = await fetch('http://localhost:3000/api/reorders'); // Using reorders as mock order history
    const data = await res.json();

    orderHistory = data.map(item => ({
      id: item.id,
      supplier: item.supplier || '-',
      product: item.product,
      quantity: item.suggested_order || item.current_stock || 0,
      order_date: item.order_date || new Date().toISOString(),
      status: item.status || 'pending'
    }));

    renderOrderHistory();
  } catch (err) {
    console.error('Fetch Order History Error:', err);
    orderHistoryTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No order history available</td></tr>`;
  }
}

// --------------------------
// Render Functions
// --------------------------
function renderSuppliers(list = suppliers) {
  tableBody.innerHTML = '';
  list.forEach((s, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${s.category || '-'}</td>
      <td>${s.contact}</td>
      <td>${s.email}</td>
      <td>${s.address}</td>
      <td>
        ${role === 'admin' ? `
          <button class="edit" data-index="${index}">Edit</button>
          <button class="delete" data-index="${index}">Delete</button>
        ` : ''}
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderReorders() {
  reorderTableBody.innerHTML = '';

  if (!reorders.length) {
    reorderTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No reorders available</td></tr>`;
    return;
  }

  reorders.forEach(item => {
    reorderTableBody.innerHTML += `
      <tr>
        <td>${item.product}</td>
        <td>${item.current_stock ?? 0}</td>
        <td>${item.suggested_order ?? 0}</td>
        <td>${item.supplier ?? '-'}</td>
        <td>
          <button class="send-reorder" onclick="sendReorder('${item.id}')" ${role !== 'admin' ? 'disabled' : ''}>Send Reorder</button>
        </td>
      </tr>
    `;
  });
}

function renderOrderHistory() {
  if (!orderHistoryTableBody) return;
  orderHistoryTableBody.innerHTML = '';

  if (!orderHistory.length) {
    orderHistoryTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No order history available</td></tr>`;
    return;
  }

  orderHistory.forEach(order => {
    orderHistoryTableBody.innerHTML += `
      <tr>
        <td>${order.id}</td>
        <td>${order.supplier}</td>
        <td>${order.product}</td>
        <td>${order.quantity}</td>
        <td>${new Date(order.order_date).toLocaleDateString()}</td>
        <td>
          <span class="${order.status === 'delivered' ? 'status-delivered' : 'status-pending'}">
            ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </td>
      </tr>
    `;
  });
}

// --------------------------
// Supplier Modal
// --------------------------
addBtn.addEventListener('click', () => {
  modal.style.display = 'block';
  modalTitle.textContent = 'Add Supplier';
  form.reset();
  supplierIndexInput.value = '';
});

function openEditModal(index) {
  const s = suppliers[index];
  modal.style.display = 'block';
  modalTitle.textContent = 'Edit Supplier';
  document.getElementById('supplierName').value = s.name;
  categorySelect.value = s.category_id || '';
  document.getElementById('supplierContact').value = s.contact;
  document.getElementById('supplierEmail').value = s.email;
  document.getElementById('supplierAddress').value = s.address;
  supplierIndexInput.value = index;
}

closeModal.onclick = () => modal.style.display = 'none';
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

// --------------------------
// Save / Delete Supplier
// --------------------------
form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    name: document.getElementById('supplierName').value,
    category_id: parseInt(categorySelect.value) || null,
    contact: document.getElementById('supplierContact').value,
    email: document.getElementById('supplierEmail').value,
    address: document.getElementById('supplierAddress').value
  };

  const index = supplierIndexInput.value;

  try {
    if (index === '') {
      await fetch('http://localhost:3000/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      const id = suppliers[index].id;
      await fetch(`http://localhost:3000/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
    await fetchSuppliers();
    modal.style.display = 'none';
  } catch (err) {
    console.error('Save Supplier Error:', err);
  }
});

tableBody.addEventListener('click', async e => {
  const btn = e.target;
  const index = btn.dataset.index;

  if (btn.classList.contains('edit')) openEditModal(index);
  if (btn.classList.contains('delete')) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    const id = suppliers[index].id;
    await fetch(`http://localhost:3000/api/suppliers/${id}`, { method: 'DELETE' });
    await fetchSuppliers();
  }
});

// --------------------------
// Send Reorder
// --------------------------
window.sendReorder = async function(productId) {
  try {
    await fetch('http://localhost:3000/api/send-reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });
    alert('Reorder email sent');
  } catch (err) {
    console.error('Send Reorder Error:', err);
    alert('Failed to send reorder');
  }
};

// --------------------------
// Search Suppliers
// --------------------------
searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();
  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(query) ||
    (s.category && s.category.toLowerCase().includes(query)) ||
    s.contact.toLowerCase().includes(query) ||
    s.email.toLowerCase().includes(query)
  );
  renderSuppliers(filtered);
});

// --------------------------
// Initialize App
// --------------------------
document.addEventListener('DOMContentLoaded', async () => {
  await fetchCategories();
  await fetchSuppliers();
  await fetchReorders();
  await fetchOrderHistory();
});
  