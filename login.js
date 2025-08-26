document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // 🔑 Demo credentials
    if (username === "admin" && password === "1234") {
      localStorage.setItem("loggedIn", "true");  // mark login
      window.location.href = "index.html";       // redirect to registration form
    } else {
      alert("Invalid username or password!");
    }
  });
});
