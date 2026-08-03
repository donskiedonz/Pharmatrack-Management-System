// ---------------- Login Form ----------------
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorMsg = document.getElementById('error-msg');

  // Clear previous message
  errorMsg.textContent = '';

  if (!username || !password) {
    errorMsg.textContent = 'Please enter username and password';
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    console.log("Login response:", data); // ✅ DEBUG: Check login API response

    if (res.ok && data.userId) {
      // Save user info in localStorage
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('username', username);
      localStorage.setItem('role', data.role);

      // Debug: check stored values
      console.log("Saved userId:", localStorage.getItem('userId'));
      console.log("Saved username:", localStorage.getItem('username'));
      console.log("Saved role:", localStorage.getItem('role'));

      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    } else {
      errorMsg.textContent = data.message || 'Invalid username or password';
    }
  } catch (err) {
    console.error('Login error:', err);
    errorMsg.textContent = 'Login failed. Check console for details.';
  }
});
