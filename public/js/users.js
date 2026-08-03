// ---------------- User Role ----------------
// Use localStorage to match your login code
const role = localStorage.getItem('role') || '';
document.getElementById('userRoleDisplay').textContent = role ? `Logged in as ${role}` : 'No role';
console.log("Current role:", role);

// ---------------- DOM Elements ----------------
const tableBody = document.getElementById('users-table');
const addBtn = document.getElementById('addUserBtn');
const modal = document.getElementById('userModal');
const closeModal = modal.querySelector('.close');
const form = document.getElementById('userForm');
const modalTitle = document.getElementById('modalTitle');
const userIndexInput = document.getElementById('userIndex');

// Profile dropdown toggle
const menuToggle = document.getElementById('menuToggle');
const menuDropdown = document.getElementById('menuDropdown');

let users = [];

// ---------------- Helper Functions ----------------
function formatDateTime(utcString) {
    if (!utcString) return 'N/A';
    const date = new Date(utcString); // parse UTC string
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true, // 12-hour format with AM/PM
    };
    return date.toLocaleString('en-US', options);
}

// Only admin can see/add users
if (role !== 'admin') {
    if (addBtn) addBtn.style.display = 'none';
    tableBody.innerHTML = `<tr><td colspan="8" style="color:red;">You do not have permission to view users.</td></tr>`;
} else {
    fetchUsers();
}

// ---------------- Fetch Users ----------------
async function fetchUsers() {
    try {
        console.log("Fetching users...");
        const res = await fetch('http://localhost:3000/api/users');
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        console.log("Fetched users:", data);
        users = data;
        renderTable();
    } catch (err) {
        console.error("Failed to fetch users:", err);
        tableBody.innerHTML = `<tr><td colspan="8" style="color:red;">Failed to load users</td></tr>`;
    }
}

// ---------------- Render Table ----------------
function renderTable() {
    tableBody.innerHTML = '';
    if (!users.length) {
        tableBody.innerHTML = `<tr><td colspan="8">No users found</td></tr>`;
        return;
    }

    users.forEach((u, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.id}</td>
            <td>${u.image ? `<img src="${u.image}" alt="User Image" class="user-img">` : 'N/A'}</td>
            <td>${u.username}</td>
            <td>${u.fullName}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>${formatDateTime(u.created_at)}</td>
            <td>
                ${role === 'admin' ? `
                    <button class="edit" onclick="editUser(${index})">Edit</button>
                    <button class="delete" onclick="deleteUser(${index})">Delete</button>
                ` : ''}
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// ---------------- Modal Handlers ----------------
if (addBtn) {
    addBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        modalTitle.textContent = 'Add User';
        form.reset();
        userIndexInput.value = '';
    });
}

closeModal.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

// ---------------- Form Submission ----------------
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const index = userIndexInput.value;
    const fileInput = document.getElementById('image');

    const formData = new FormData();
    formData.append('username', document.getElementById('username').value.trim());
    formData.append('fullName', document.getElementById('fullName').value.trim());
    formData.append('email', document.getElementById('email').value.trim());
    formData.append('role', document.getElementById('role').value);

    const passwordValue = document.getElementById('password').value;
    if (index === '' && !passwordValue) {
        alert("Password is required for new users");
        return;
    }
    if (passwordValue) formData.append('password', passwordValue);

    if (fileInput.files[0]) formData.append('image', fileInput.files[0]);

    try {
        let url = 'http://localhost:3000/api/users';
        let method = 'POST';
        if (index !== '') {
            const id = users[index].id;
            url = `http://localhost:3000/api/users/${id}`;
            method = 'PUT';
        }

        const res = await fetch(url, { method, body: formData });
        if (!res.ok) {
            const text = await res.text();
            console.error("Server response:", text);
            throw new Error(`Failed to save user. Status: ${res.status}`);
        }

        await fetchUsers();
        modal.style.display = 'none';
    } catch (err) {
        console.error(err);
        alert('Error saving user. Check console for details.');
    }
});

// ---------------- Edit & Delete ----------------
function editUser(index) {
    modal.style.display = 'block';
    modalTitle.textContent = 'Edit User';
    const u = users[index];
    document.getElementById('username').value = u.username;
    document.getElementById('fullName').value = u.fullName;
    document.getElementById('email').value = u.email;
    document.getElementById('role').value = u.role;
    document.getElementById('password').value = '';
    userIndexInput.value = index;
}

async function deleteUser(index) {
    const id = users[index].id;
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        const res = await fetch(`http://localhost:3000/api/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`Failed to delete user. Status: ${res.status}`);
        await fetchUsers();
    } catch (err) {
        console.error(err);
        alert('Error deleting user. Check console for details.');
    }
}

// ---------------- Menu Dropdown ----------------
menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', (e) => {
    if (!menuDropdown.contains(e.target) && !menuToggle.contains(e.target)) {
        menuDropdown.style.display = 'none';
    }
});

// ---------------- Logout ----------------
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear(); // clear user data on logout
    window.location.href = 'index.html';
});

// ---------------- Live Date & Time ----------------
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true 
    };
    document.getElementById('liveDateTime').textContent = now.toLocaleString('en-US', options);
}
setInterval(updateDateTime, 1000);
updateDateTime();
