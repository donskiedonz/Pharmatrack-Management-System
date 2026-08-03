document.addEventListener('DOMContentLoaded', () => {

  const role = sessionStorage.getItem('userRole') || 'admin';
  document.getElementById('userRoleDisplay').textContent = `Logged in as ${role}`;

  // DOM Elements
  const tableBody = document.getElementById('sales-table');
  const addBtn = document.getElementById('addSaleBtn');
  const modal = document.getElementById('saleModal');
  const modalContent = modal.querySelector('.modal-content');
  const closeModal = modal.querySelector('.close');
  const form = document.getElementById('saleForm');
  const modalTitle = document.getElementById('modalTitle');
  const saleIndexInput = document.getElementById('saleIndex');

  const searchInput = document.getElementById('searchInput');
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');

  const menuToggle = document.getElementById('menuToggle');
  const menuDropdown = document.getElementById('menuDropdown');

  const productSelect = document.getElementById('saleProduct');
  const salePriceInput = document.getElementById('salePrice');
  const saleTotalInput = document.getElementById('saleTotal');
  const saleQuantityInput = document.getElementById('saleQuantity');
  const saleCustomerInput = document.getElementById('saleCustomer');
  const saleDateInput = document.getElementById('saleDate');
  const cancelBtn = document.getElementById('cancelBtn');

  let sales = [];
  let filteredSales = [];
  let products = [];

  // Hide Add button for non-admins
  if(role !== 'admin') addBtn.style.display = 'none';

  // ------------------------
  // Fetch sales
  // ------------------------
  function fetchSales() {
    fetch('http://localhost:3000/api/sales')
      .then(res => res.json())
      .then(data => {
        sales = data;
        filteredSales = [...sales];
        renderTable();
      })
      .catch(err => console.error('Error fetching sales:', err));
  }

  // ------------------------
  // Render table
  // ------------------------
  function renderTable() {
    tableBody.innerHTML = '';
    if(filteredSales.length === 0){
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No sales found</td></tr>`;
      return;
    }

    filteredSales.forEach((s, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDate(s.date)}</td>
        <td>${s.customer}</td>
        <td>${s.product}</td>
        <td>${s.quantity}</td>
        <td>${parseFloat(s.price).toFixed(2)}</td>
        <td>${(s.quantity * s.price).toFixed(2)}</td>
        <td>
          ${role === 'admin' ? 
            `<button class="edit" data-index="${index}">Edit</button>
             <button class="delete" data-index="${index}">Delete</button>` : ''}
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // ------------------------
  // Event delegation for Edit/Delete
  // ------------------------
  tableBody.addEventListener('click', (e) => {
    if(e.target.classList.contains('edit')) {
      const index = parseInt(e.target.dataset.index);
      editSale(index);
    } else if(e.target.classList.contains('delete')) {
      const index = parseInt(e.target.dataset.index);
      deleteSale(index);
    }
  });

  // ------------------------
  // Fetch products
  // ------------------------
  function fetchProducts() {
    fetch('http://localhost:3000/api/products')
      .then(res => res.json())
      .then(data => {
        products = data;
        productSelect.innerHTML = '';
        products.forEach(p => {
          const option = document.createElement('option');
          option.value = p.name;
          option.textContent = p.name;
          productSelect.appendChild(option);
        });
        updatePriceAndTotal();
      })
      .catch(err => console.error('Error fetching products:', err));
  }

  // ------------------------
  // Update price and total
  // ------------------------
  function updatePriceAndTotal() {
    const selectedProduct = products.find(p => p.name === productSelect.value);
    const price = selectedProduct ? parseFloat(selectedProduct.price) : 0;
    const qty = parseInt(saleQuantityInput.value) || 0;
    salePriceInput.value = price.toFixed(2);
    saleTotalInput.value = (price * qty).toFixed(2);
  }

  saleQuantityInput.addEventListener('input', updatePriceAndTotal);
  productSelect.addEventListener('change', updatePriceAndTotal);
  salePriceInput.addEventListener('input', updatePriceAndTotal);

  // ------------------------
  // Filter sales
  // ------------------------
  function filterSales() {
    const term = searchInput.value.toLowerCase();
    const start = startDate.value ? new Date(startDate.value) : null;
    const end = endDate.value ? new Date(endDate.value) : null;

    filteredSales = sales.filter(s => {
      const date = new Date(s.date);
      const matchesSearch = s.customer.toLowerCase().includes(term) || s.product.toLowerCase().includes(term);
      const matchesStart = start ? date >= start : true;
      const matchesEnd = end ? date <= end : true;
      return matchesSearch && matchesStart && matchesEnd;
    });

    renderTable();
  }

  searchInput.addEventListener('input', filterSales);
  startDate.addEventListener('change', filterSales);
  endDate.addEventListener('change', filterSales);

  // ------------------------
  // Open modal
  // ------------------------
  function openModal(title = 'Add Sale', isEdit = false) {
    modalTitle.textContent = title;
    if(!isEdit) {
      form.reset();
      saleIndexInput.value = '';
    }
    updatePriceAndTotal();
    modal.classList.add('show');
    modalContent.scrollTop = 0;
  }

  addBtn.addEventListener('click', () => openModal('Add Sale'));
  closeModal.addEventListener('click', () => modal.classList.remove('show'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('show'));
  window.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('show'); });

  // ------------------------
  // Form submit
  // ------------------------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      date: saleDateInput.value,
      customer: saleCustomerInput.value,
      product: productSelect.value,
      quantity: parseInt(saleQuantityInput.value),
      price: parseFloat(salePriceInput.value)
    };

    const index = saleIndexInput.value;

    if(index === '') {
      // Add new sale
      fetch('http://localhost:3000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
      .then(() => {
        fetchSales();
        modal.classList.remove('show');
      })
      .catch(err => console.error(err));
    } else {
      // Update sale
      const id = filteredSales[index].id;
      fetch(`http://localhost:3000/api/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
      .then(() => {
        fetchSales();
        modal.classList.remove('show');
      })
      .catch(err => console.error(err));
    }
  });

  // ------------------------
  // Edit sale
  // ------------------------
  function editSale(index) {
  const s = filteredSales[index];

  // Convert price to number
  const price = parseFloat(s.price) || 0;

  saleCustomerInput.value = s.customer;
  productSelect.value = s.product;
  saleQuantityInput.value = s.quantity;
  salePriceInput.value = price.toFixed(2);

  // Format date for <input type="date"> (YYYY-MM-DD)
  const dateObj = new Date(s.date);
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  saleDateInput.value = `${yyyy}-${mm}-${dd}`;

  saleIndexInput.value = index;
  updatePriceAndTotal();
  openModal('Edit Sale', true);
}


  // ------------------------
  // Delete sale
  // ------------------------
  function deleteSale(index) {
    const id = filteredSales[index].id;
    if(confirm('Are you sure?')) {
      fetch(`http://localhost:3000/api/sales/${id}`, { method: 'DELETE' })
        .then(() => fetchSales())
        .catch(err => console.error(err));
    }
  }

  // ------------------------
  // Live Date & Time
  // ------------------------
  function updateDateTime() {
    const now = new Date();
    const options = { 
      weekday: 'short', year: 'numeric', month: 'short', 
      day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
    };
    document.getElementById('liveDateTime').textContent = now.toLocaleDateString('en-US', options);
  }
  setInterval(updateDateTime, 1000);
  updateDateTime();

  // ------------------------
  // Profile menu toggle
  // ------------------------
  menuToggle.addEventListener('click', () => {
    menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
  });

  window.addEventListener('click', (e) => {
    if(!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
      menuDropdown.style.display = 'none';
    }
  });

  // ------------------------
  // Helper: format date
  // ------------------------
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  // ------------------------
  // Initial fetch
  // ------------------------
  fetchProducts();
  fetchSales();

});
