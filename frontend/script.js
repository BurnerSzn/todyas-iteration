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
    const response = await fetch(window.location.origin + "/upload", {
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
  const email = document.getElementById("emailInput").value.trim();
  const pwd = document.getElementById("passwordInput").value;
  document.getElementById("modalLoginBtn").disabled =
    !(email.includes("@") && pwd.length >= 8);
}

function handleModalLogin() {
  const email = document.getElementById("emailInput").value.trim();

  document.getElementById("userInfo").innerText =
    `Logged in as: ${email}`;

  document.querySelector(".login-btn").innerText = "Logged in";
  closeLogin();
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("emailInput").addEventListener("input", validateLogin);
  document.getElementById("passwordInput").addEventListener("input", validateLogin);
  
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































