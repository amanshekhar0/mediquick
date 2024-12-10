import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminPart.css"

const AdminLogin = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Placeholder API call to backend
      const response = await fetch(
        "https://xnv54w0n-8080.inc1.devtunnels.ms/api/login/hospital",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert("Login successful!");
        
        // Store the username in localStorage
        console.log(result._id);
        localStorage.setItem("username", result.hospital._id);

        // Redirect to Admin Dashboard
        navigate("/dashboard");
      } else {
        setError(result.message || "Invalid username or password");
      }
    } catch (err) {
      console.error("Error during login:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="admin-login-container">
      <h1 className="admin-login-header">Hospital Login</h1>
      <form className="admin-login-form" onSubmit={handleSubmit}>
        {error && <p className="admin-error-message">{error}</p>}
        <div className="admin-form-group">
          <label className="admin-label">Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Enter username"
            required
            className="admin-input"
          />
        </div>
        <div className="admin-form-group">
          <label className="admin-label">Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter password"
            required
            className="admin-input"
          />
        </div>
        <button type="submit" className="admin-submit-btn">Login</button>
      </form>
      <p className="admin-signup-link">
        Don't have an account? <a href="/hospitalsignup">Sign Up</a>
      </p>
    </div>
  );
};

export default AdminLogin;
