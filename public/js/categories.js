const role = sessionStorage.getItem('userRole') || 'admin';
document.getElementById('userRoleDisplay').textContent = `Logged in as ${role}`;

const tableBody = document.getElementById('categories-table');
const addBtn = document.getElementById('addCategoryBtn');
const modal = document.getElementById('categoryModal');
const closeModal = modal.querySelector('.close');
const form = document.getElementById('categoryForm');
const modalTitle = document.getElementById('modalTitle');
const categoryIndexInput = document.getElementById('categoryIndex');


const lowStockList = document.getElementById("lowStockList");
const restockList = document.getElementById("restockList");

const searchInput = document.getElementById('searchInput');

// Profile dropdown toggle
const menuToggle = document.getElementById('menuToggle');
const menuDropdown = document.getElementById('menuDropdown');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase(); // lowercase for case-insensitive search

  const filtered = categories.filter(cat => 
    cat.name.toLowerCase().includes(query) ||
    (cat.description && cat.description.toLowerCase().includes(query))
  );

  renderTable(filtered); // pass filtered array
});

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
});

// Close dropdown if clicked outside
document.addEventListener('click', (e) => {
    if (!menuDropdown.contains(e.target) && !menuToggle.contains(e.target)) {
        menuDropdown.style.display = 'none';
    }
});

// Logout button
document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
});


let categories = [];

if(role !== 'admin') addBtn.style.display='none';

function fetchCategories() {
    fetch('http://localhost:3000/api/categories')
        .then(res=>res.json())
        .then(data=>{ categories=data;
            console.log(categories);
             renderTable(); })
        .catch(err=>console.error(err));
}

function renderTable(list = categories) {
  tableBody.innerHTML = '';

  list.forEach((c, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.description || '<i>No description</i>'}</td>
      <td>
        ${role === 'admin' ? 
          `<button class="edit" onclick="editCategory(${index})">Edit</button>
           <button class="delete" onclick="deleteCategory(${index})">Delete</button>` : ''}
      </td>
    `;
    tableBody.appendChild(tr);
  });
}




addBtn.addEventListener('click', ()=>{
    modal.style.display='block';
    modalTitle.textContent='Add Category';
    form.reset();
    categoryIndexInput.value='';
});

closeModal.onclick = ()=> modal.style.display='none';
window.onclick = (e)=>{ if(e.target===modal) modal.style.display='none'; };

form.addEventListener('submit', (e)=>{
    e.preventDefault();
   const data = {
  name: document.getElementById('categoryName').value,
  description: document.getElementById('categoryDescription').value
};

    const index = categoryIndexInput.value;
    if(index===''){
        fetch('http://localhost:3000/api/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        .then(()=>{ fetchCategories(); modal.style.display='none'; });
    } else {
        const id = categories[index].id;
        fetch(`http://localhost:3000/api/categories/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        .then(()=>{ fetchCategories(); modal.style.display='none'; });
    }
});

function editCategory(index){
    modal.style.display='block';
    modalTitle.textContent='Edit Category';
    document.getElementById('categoryName').value=categories[index].name;
    categoryIndexInput.value=index;
}

function deleteCategory(index){
    const id=categories[index].id;
    if(confirm('Are you sure?')){
        fetch(`http://localhost:3000/api/categories/${id}`,{method:'DELETE'})
        .then(()=>fetchCategories());
    }
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
updateDateTime(); // initial call




fetchCategories();
