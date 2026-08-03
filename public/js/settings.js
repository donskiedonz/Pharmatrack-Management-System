// ==========================
// settings.js
// ==========================
console.log("settings.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");

  // ---------------- User Info ----------------
  const userId = localStorage.getItem("userId");
  console.log("userId from localStorage:", userId);

  const profileForm = document.getElementById("profileForm");
  const passwordForm = document.getElementById("passwordForm");
  const statusMsg = document.getElementById("statusMsg");

  const fullName = document.getElementById("fullName");
  const email = document.getElementById("email");
  const role = document.getElementById("role");
  const profileImage = document.getElementById("profileImage");
  const profilePreview = document.getElementById("profilePreview");

  const userApiUrl = userId ? `/api/users/${userId}` : null;

  // ---------------- Helper ----------------
  function showStatus(message, success = true) {
    if (!statusMsg) return;
    statusMsg.textContent = message;
    statusMsg.style.color = success ? "green" : "red";
  }



  // ---------------- Load Profile ----------------
  async function loadProfile() {
    if (!userId) {
      if (profilePreview) profilePreview.src = "/img/default-user.jpg";
      showStatus("❌ No user logged in", false);
      return;
    }

    try {
      const res = await fetch(userApiUrl);
      console.log("API response status:", res.status);

      if (!res.ok) throw new Error(`Failed to load profile: ${res.status}`);

      const user = await res.json();
      console.log("User data fetched:", user);

      // --- Populate fields ---
      if (fullName) fullName.value = user.fullName || user.username || "N/A";
      if (email) email.value = user.email || "N/A";
      if (role) {
        role.value = (user.role && user.role.trim()) ? user.role : "N/A";
        role.readOnly = true; // use readonly instead of disabled
      }
      if (profilePreview) profilePreview.src = user.image || "/img/default-user.jpg";

      showStatus("", true);
    } catch (err) {
      console.error("Load profile error:", err);
      if (profilePreview) profilePreview.src = "/img/default-user.jpg";
      showStatus("", false);
    }
  }

  // ---------------- Update Profile ----------------
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!userId) return showStatus("❌ No user logged in", false);

      const formData = new FormData();
      if (fullName) formData.append("fullName", fullName.value);
      if (email) formData.append("email", email.value);
      if (profileImage?.files[0]) formData.append("image", profileImage.files[0]);

      try {
        const res = await fetch(userApiUrl, { method: "PUT", body: formData });
        const result = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(result.message || `Profile update failed: ${res.status}`);


        // Reload profile after update
        await loadProfile();
      } catch (err) {
        console.error("Update profile error:", err);
        showStatus(`❌ ${err.message}`, false);
      }
    });
  }

// ---------------- Change Password ----------------
if (passwordForm) {
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!userId) return showStatus("❌ No user logged in", false);

    const currentPassword = document.getElementById("currentPassword")?.value;
    const newPassword = document.getElementById("newPassword")?.value;
    const confirmPassword = document.getElementById("confirmPassword")?.value;

    if (newPassword !== confirmPassword) {
      return showStatus("❌ Passwords do not match", false);
    }

    try {
      const res = await fetch(`${userApiUrl}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || "Password change failed");

      // ✅ Show success message
      showStatus("🔐 Password changed successfully. Logging out...", true);

      // ✅ Auto logout with a 1.5-second delay
      setTimeout(() => {
        localStorage.removeItem("userId"); // clear login info
        window.location.href = "/index.html"; // redirect to login page
      }, 1500);

    } catch (err) {
      console.error("Password change error:", err);
      showStatus(`❌ ${err.message}`, false);
    }
  });
}



  // ---------------- Profile Image Preview ----------------
  if (profileImage) {
    profileImage.addEventListener("change", () => {
      const file = profileImage.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => { if (profilePreview) profilePreview.src = reader.result; };
      reader.readAsDataURL(file);
    });
  }

  // ------------------------
// Live Date & Time
// ------------------------
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  document.getElementById('liveDateTime').textContent =
    now.toLocaleDateString('en-US', options);
}

setInterval(updateDateTime, 1000);
updateDateTime();

// ------------------------
// Profile menu toggle
// ------------------------
const menuToggle = document.getElementById('menuToggle');
const menuDropdown = document.getElementById('menuDropdown');

menuToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  menuDropdown.style.display =
    menuDropdown.style.display === 'block' ? 'none' : 'block';
});

window.addEventListener('click', () => {
  menuDropdown.style.display = 'none';
});

// ------------------------
// Logout
// ------------------------
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '/index.html';
});


  // ---------------- Init ----------------
  loadProfile(); // ✅ load immediately after DOM ready
});
