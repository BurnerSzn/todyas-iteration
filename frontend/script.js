// upload 
async function uploadImage() {
  const input = document.getElementById("imageInput");
  const status = document.getElementById("status");
  const results = document.getElementById("results");

  if (!input.files.length) {
    alert("Please select an image");
    return;
  }

  status.innerText = "AI analysing image...";
  results.innerHTML = "";

  const formData = new FormData();
  formData.append("file", input.files[0]);

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      const message =
        data?.detail ||
        data?.message ||
        `HTTP ${response.status} ${response.statusText || ""}`.trim();
      throw new Error(message);
    }

    const prediction = data?.prediction ?? "Unknown";
    const confidence = data?.confidence ?? "N/A";
    status.innerText = `Detected: ${prediction} (confidence ${confidence})`;

    const resultsList = Array.isArray(data?.results) ? data.results : [];
    resultsList.forEach(item => {
      const div = document.createElement("div");
      div.className = "result";

      div.innerHTML = `
        <strong>${item.item}</strong><br>
        Store: ${item.store}<br>
        Price: ${item.price}<br>
        ${item.thumbnail ? `<img src="${item.thumbnail}" style="width:100%;max-width:180px;margin-top:8px;border-radius:6px;">` : ""}
        ${item.link ? `<div style="margin-top:6px;"><a href="${item.link}" target="_blank">View product</a></div>` : ""}
      `;

      results.appendChild(div);
    });


    if (!resultsList.length) {
      results.innerHTML = "<div class=\"result\">No results returned.</div>";
    }

  } catch (error) {
    console.error(error);
    status.innerText = "Error contacting backend: " + (error?.message || String(error));
  }
}

//  Modal
function openLogin() {
  document.getElementById("loginModal").style.display = "block";
  validateLogin();
}

function closeLogin() {
  document.getElementById("loginModal").style.display = "none";
}

window.onclick = function (e) {
  const modal = document.getElementById("loginModal");
  if (e.target === modal) closeLogin();
};

//  Login
function validateLogin() {
  const email = document.getElementById("loginEmailInput").value.trim();
  const pwd = document.getElementById("loginPasswordInput").value;
  document.getElementById("modalLoginBtn").disabled =
    !(email.includes("@") && pwd.length >= 8);
}

function validateRegister() {
  const email = document.getElementById("registerEmailInput").value.trim();
  const pwd = document.getElementById("registerPasswordInput").value;
  document.getElementById("modalRegisterBtn").disabled =
    !(email.includes("@") && pwd.length >= 8);
}

function showLogin() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("registerTab").classList.remove("active");
}

function showRegister() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
  document.getElementById("registerTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");
}

async function handleLogin() {
  const email = document.getElementById("loginEmailInput").value.trim();
  const password = document.getElementById("loginPasswordInput").value;
  const messageDiv = document.getElementById("loginMessage");

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("token", data.access_token);
      document.getElementById("userInfo").innerText = `Logged in as: ${email}`;
      document.querySelector(".login-btn").innerText = "Logged in";
      closeLogin();
    } else {
      messageDiv.innerText = data.detail || "Login failed";
    }
  } catch (error) {
    messageDiv.innerText = "Network error";
  }
}

async function handleRegister() {
  const email = document.getElementById("registerEmailInput").value.trim();
  const password = document.getElementById("registerPasswordInput").value;
  const messageDiv = document.getElementById("registerMessage");

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (response.ok) {
      messageDiv.innerText = "Registration successful! Please login.";
      showLogin();
    } else {
      messageDiv.innerText = data.detail || "Registration failed";
    }
  } catch (error) {
    messageDiv.innerText = "Network error";
  }
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginEmailInput").addEventListener("input", validateLogin);
  document.getElementById("loginPasswordInput").addEventListener("input", validateLogin);
  document.getElementById("registerEmailInput").addEventListener("input", validateRegister);
  document.getElementById("registerPasswordInput").addEventListener("input", validateRegister);
  
  // Load contrast preference
  const savedContrast = localStorage.getItem("highContrast");
  if (savedContrast === "true") {
    document.body.classList.add("high-contrast");
  }
});

// Toggle contrast mode
function toggleContrast() {
  document.body.classList.toggle("high-contrast");
  const isHighContrast = document.body.classList.contains("high-contrast");
  localStorage.setItem("highContrast", isHighContrast);
}































