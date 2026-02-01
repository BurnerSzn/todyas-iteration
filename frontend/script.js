async function uploadImage() {
  const input = document.getElementById("imageInput");
  const status = document.getElementById("status");
  const resultsDiv = document.getElementById("results");

  if (!input.files.length) {
    alert("Please select an image");
    return;
  }

  status.innerText = "AI analysing image...";
  resultsDiv.innerHTML = "";

  const formData = new FormData();
  formData.append("file", input.files[0]);

  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch("http://127.0.0.1:8000/upload", {
      method: "POST",
      body: formData,
      headers
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    status.innerText = `Detected: ${data.prediction} (confidence ${data.confidence})`;

    data.results.forEach(item => {
      const div = document.createElement("div");
      div.className = "result";
      div.innerHTML = `
        <strong>${item.item}</strong><br>
        Store: ${item.store}<br>
        Price: ${item.price}
      `;
      resultsDiv.appendChild(div);
    });

  } catch (error) {
    console.error(error);
    status.innerText = "Error contacting backend";
  }
}

function openLogin() {
  document.getElementById("loginModal").style.display = "block";
  // ensure login button state is correct whenever modal opens
  validateLoginInputs();
}

function closeLogin() {
  document.getElementById("loginModal").style.display = "none";
}

window.onclick = function(event) {
  const modal = document.getElementById("loginModal");
  if (event.target === modal) {
    modal.style.display = "none";
  }
}

// --- Login modal validation and handling ---
function isValidEmail(email) {
  // simple email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLoginInputs() {
  const emailEl = document.getElementById('emailInput');
  const pwdEl = document.getElementById('passwordInput');
  const btn = document.getElementById('modalLoginBtn');
  if (!emailEl || !pwdEl || !btn) return;

  const email = (emailEl.value || '').trim();
  const pwd = pwdEl.value || '';

  const valid = isValidEmail(email) && pwd.length >= 8;
  btn.disabled = !valid;
}

function handleModalLogin() {
  console.log('handleModalLogin called');
  const emailEl = document.getElementById('emailInput');
  const pwdEl = document.getElementById('passwordInput');
  const modal = document.getElementById('loginModal');
  const loginBtn = document.getElementById('headerLoginBtn');
  if (!emailEl || !pwdEl || !modal) return;

  const email = (emailEl.value || '').trim();
  const pwd = pwdEl.value || '';

  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (pwd.length < 8) {
    alert('Password must be at least 8 characters.');
    return;
  }

  // Call backend login
  fetch('http://127.0.0.1:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pwd })
  }).then(async res => {
    console.log('Login response status:', res.status);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Login error:', err);
      alert(err.detail || 'Login failed');
      return;
    }

    const data = await res.json();
    console.log('Login success:', data);
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user_email', email);
      if (loginBtn) loginBtn.textContent = 'Logout';
      // Show email in userInfo
      const userInfo = document.getElementById('userInfo');
      if (userInfo) userInfo.textContent = `Logged in as: ${email}`;
      modal.style.display = 'none';
    }
  }).catch(err => {
    console.error('Fetch error:', err);
    alert('Login request failed: ' + err.message);
  });
}

function headerAuthAction() {
  const token = localStorage.getItem('token');
  const loginBtn = document.getElementById('headerLoginBtn');
  if (token) {
    // logout
    localStorage.removeItem('token');
    if (loginBtn) loginBtn.textContent = 'Login';
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = '';
    alert('Logged out');
  } else {
    openLogin();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const emailEl = document.getElementById('emailInput');
  const pwdEl = document.getElementById('passwordInput');
  const btn = document.getElementById('modalLoginBtn');
  if (emailEl) emailEl.addEventListener('input', validateLoginInputs);
  if (pwdEl) pwdEl.addEventListener('input', validateLoginInputs);
  if (btn) btn.addEventListener('click', handleModalLogin);
  // update login button text if already logged in
  const token = localStorage.getItem('token');
  const loginBtn = document.getElementById('headerLoginBtn');
  if (token && loginBtn) loginBtn.textContent = 'Logout';
  // show email if stored (we only have token, so userInfo may be empty)
  const userInfo = document.getElementById('userInfo');
  if (token && userInfo) {
    // If you want to show the email after refresh, you should store it too; try localStorage email if present
    const storedEmail = localStorage.getItem('user_email');
    if (storedEmail) userInfo.textContent = `Logged in as: ${storedEmail}`;
  }
});
