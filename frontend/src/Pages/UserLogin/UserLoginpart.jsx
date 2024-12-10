import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UserLoginpart = () => {
    localStorage.setItem("username", "67574fba8595217ab97a5999");

  const [credentials, setCredentials] = useState({
    username: "",
    password: "",

  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "https://xnv54w0n-8080.inc1.devtunnels.ms/api/login/people",
        credentials
      );
      if (response.data.success) {
        localStorage.setItem("username", "67574fba8595217ab97a5999");
        alert("Login successful!");

        // Navigate after 2 seconds
        setTimeout(() => {
          navigate("/"); // Redirect to user dashboard
        }, 2000); // 2000 milliseconds = 2 seconds
      } else {
        alert(response.data.message || "Invalid credentials.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during login.");
    }
  };
   const handelSubmit1=()=>{
    navigate("/");  

   }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <h1>User Login</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={credentials.username}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={credentials.password}
            onChange={handleChange}
            required
          />
          <button type="submit" onClick={handelSubmit1}>Login</button>
        </form>
        <p className="signup-link">
          Don't have an account? <a href="/usersignup">Sign up</a>
        </p>
      </div>
    </div>
  );
};

export default UserLoginpart;
