/* ===========================
   User Role
=========================== */
const role = sessionStorage.getItem("userRole") || "admin";
document.getElementById("userRoleDisplay").textContent = `Logged in as ${role}`;

/* ===========================
   DOM Elements
=========================== */
const tableBody = document.getElementById("products-table");
const addBtn = document.getElementById("addProductBtn");
const modal = document.getElementById("productModal");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = modal.querySelector(".close");

const imageModal = document.getElementById("imageModal");
const imageModalClose = document.getElementById("imageModalClose");
const largeImage = document.getElementById("largeImage");

const form = document.getElementById("productForm");
const productIndexInput = document.getElementById("productIndex");

const productName = document.getElementById("productName");
const productQuantity = document.getElementById("productQuantity");
const productPrice = document.getElementById("productPrice");
const productExpiry = document.getElementById("productExpiry");
const categorySelect = document.getElementById("productCategory");
const supplierSelect = document.getElementById("productSupplier");
const productImageInput = document.getElementById("productImage");
const imagePreview = document.getElementById("imagePreview");

/* Filters */
const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const filterExpiry = document.getElementById("filterExpiry");
const filterQuantity = document.getElementById("filterQuantity");

const lowStockList = document.getElementById("lowStockList");
const restockList = document.getElementById("restockList");

/* ===========================
   State
=========================== */
let products = [];
let categories = [];
let suppliers = [];

if (role !== "admin") addBtn.style.display = "none";

/* ===========================
   Modal Handling
=========================== */
closeModalBtn.onclick = () => {
  modal.style.display = "none";
  imagePreview.src = "";
  imagePreview.style.display = "none";
  productImageInput.value = "";
};
imageModalClose.onclick = () => (imageModal.style.display = "none");

window.onclick = (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
    imagePreview.src = "";
    imagePreview.style.display = "none";
    productImageInput.value = "";
  }
  if (e.target === imageModal) imageModal.style.display = "none";
};

/* ===========================
   Image Preview
=========================== */
productImageInput.addEventListener("change", () => {
  const file = productImageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.src = reader.result;
    imagePreview.style.display = "block";
  };
  reader.readAsDataURL(file);
});

/* ===========================
   Fetch Categories
=========================== */
async function fetchCategories() {
  try {
    const res = await fetch("http://localhost:3000/api/categories");
    categories = await res.json();
    renderCategoryOptions();
  } catch (err) {
    console.error("Error fetching categories:", err);
  }
}

function renderCategoryOptions() {
  categorySelect.innerHTML = `<option value="">-- Select Category --</option>`;
  filterCategory.innerHTML = `<option value="">All Categories</option>`;
  categories.forEach(c => {
    categorySelect.add(new Option(c.name, c.id));
    filterCategory.add(new Option(c.name, c.name));
  });
}

/* ===========================
   Fetch Suppliers
=========================== */
async function fetchSuppliers() {
  try {
    const res = await fetch("http://localhost:3000/api/suppliers");
    suppliers = await res.json();
    renderSupplierOptions();
  } catch (err) {
    console.error("Error fetching suppliers:", err);
  }
}

function renderSupplierOptions() {
  supplierSelect.innerHTML = `<option value="">-- Select Supplier --</option>`;
  suppliers.forEach(s => {
    supplierSelect.add(new Option(s.name, s.id));
  });
}

/* ===========================
   Fetch Products
=========================== */
async function fetchProducts() {
  try {
    const res = await fetch("http://localhost:3000/api/products");
    products = await res.json();
    renderTable(products);
    renderAlerts();
  } catch (err) {
    console.error("Error fetching products:", err);
  }
}

/* ===========================
   Render Table
=========================== */
function renderTable(data) {
  tableBody.innerHTML = "";
  data.forEach((p, i) => {
    const expiry = p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : "";
    const imageUrl = p.image ? `/uploads/products/${p.image}` : "img/no-image.png";
    const supplierName = suppliers.find(s => s.id === p.supplier_id)?.name || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td><img src="${imageUrl}" class="table-img" data-product-id="${p.id}" 
          onerror="this.onerror=null; this.src='img/no-image.png';"></td>
      <td>${p.name}</td>
      <td>${p.category_name || "N/A"}</td>
      <td>${p.quantity}</td>
      <td>₱${Number(p.price).toFixed(2)}</td>
      <td>${expiry}</td>
      <td>${supplierName}</td>
      <td>
        ${
          role === "admin"
            ? `<button class="edit" onclick="editProduct(${i})">Edit</button>
               <button class="delete" onclick="deleteProduct(${i})">Delete</button>`
            : ""
        }
      </td>
    `;
    tableBody.appendChild(tr);
  });
  makeImagesClickable(data);
}

/* ===========================
   Filters
=========================== */
function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const cat = filterCategory.value;
  const expiry = filterExpiry.value;
  const stock = filterQuantity.value;
  const today = new Date();

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search)) return false;
    if (cat && p.category_name !== cat) return false;

    if (expiry === "expired" && new Date(p.expiry_date) >= today) return false;
    if (expiry === "soon") {
      const days = (new Date(p.expiry_date) - today) / (1000 * 60 * 60 * 24);
      if (days < 0 || days > 30) return false;
    }

    if (stock === "low" && p.quantity > 10) return false;
    if (stock === "out" && p.quantity !== 0) return false;

    return true;
  });

  renderTable(filtered);
}

[searchInput, filterCategory, filterExpiry, filterQuantity].forEach(el => el.addEventListener("input", applyFilters));

/* ===========================
   Add / Edit Product
=========================== */
addBtn.onclick = () => {
  modal.style.display = "block";
  modalTitle.textContent = "Add Product";
  form.reset();
  imagePreview.style.display = "none";
  productIndexInput.value = "";
  supplierSelect.value = "";
};

form.addEventListener("submit", async e => {
  e.preventDefault();

  let imageFilename = null;
  if (productImageInput.files[0]) {
    const fd = new FormData();
    fd.append("image", productImageInput.files[0]);
    const res = await fetch("http://localhost:3000/api/products/upload", { method: "POST", body: fd });
    imageFilename = (await res.json()).filename;
  }

  const data = {
    name: productName.value,
    category_id: Number(categorySelect.value) || null,
    quantity: Number(productQuantity.value),
    price: Number(productPrice.value),
    expiry_date: productExpiry.value || null,
    image: imageFilename,
    supplier_id: Number(supplierSelect.value) || null,
  };

  const index = productIndexInput.value;
  const url = index === "" ? "http://localhost:3000/api/products" : `http://localhost:3000/api/products/${products[index].id}`;
  await fetch(url, {
    method: index === "" ? "POST" : "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  modal.style.display = "none";
  fetchProducts();
});

/* ===========================
   Edit / Delete
=========================== */
window.editProduct = index => {
  const p = products[index];
  modal.style.display = "block";
  modalTitle.textContent = "Edit Product";
  productIndexInput.value = index;

  productName.value = p.name;
  productQuantity.value = p.quantity;
  productPrice.value = p.price;
  productExpiry.value = p.expiry_date || "";
  categorySelect.value = p.category_id || "";
  supplierSelect.value = p.supplier_id || "";

  imagePreview.src = p.image ? `/uploads/products/${p.image}` : "";
  imagePreview.style.display = p.image ? "block" : "none";
  productImageInput.value = "";
};

window.deleteProduct = async index => {
  if (!confirm("Delete this product?")) return;
  await fetch(`http://localhost:3000/api/products/${products[index].id}`, { method: "DELETE" });
  fetchProducts();
};

/* ===========================
   Image Modal
=========================== */
function makeImagesClickable(data) {
  document.querySelectorAll(".table-img").forEach(img => {
    img.onclick = () => {
      const id = Number(img.dataset.productId);
      const product = data.find(p => p.id === id);
      largeImage.src = product?.image ? `/uploads/products/${product.image}` : "img/no-image.png";
      largeImage.onerror = () => { largeImage.src = "img/no-image.png"; };
      imageModal.style.display = "block";
    };
  });
}

/* ===========================
   Alerts
=========================== */
function renderAlerts() {
  lowStockList.innerHTML = "";
  restockList.innerHTML = "";

  products.forEach(p => {
    if (p.quantity <= (p.reorder_level || 10)) {
      const li1 = document.createElement("li");
      li1.textContent = `${p.name} is low in stock (${p.quantity} left)`;
      lowStockList.appendChild(li1);

      const li2 = document.createElement("li");
      li2.textContent = `Restock ${p.name} to ${p.reorder_qty || 50} units (current: ${p.quantity})`;
      restockList.appendChild(li2);
    }
  });
}

/* ===========================
   Live Date & Time
=========================== */
function updateDateTime() {
  const now = new Date();
  const options = { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' };
  document.getElementById('liveDateTime').textContent = now.toLocaleDateString('en-US', options);
}
setInterval(updateDateTime, 1000);
updateDateTime();

/* ===========================
   Init
=========================== */
fetchCategories();
fetchSuppliers();
fetchProducts();
