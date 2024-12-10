import React, { useState } from 'react';
import './AdminPart.css'; // Ensure this CSS file is included
import { useNavigate } from 'react-router-dom';

const AdminSignup = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    address: '',
    contact: '',
    pincode: '',
  });

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      name,
      username,
      password,
      email,
      address,
      contact,
      pincode,
    } = formData;

    const endpoint = 'https://xnv54w0n-8080.inc1.devtunnels.ms/api/hospitals';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          username,
          password,
          email,
          address,
          contact,
          pincode,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Admin registration successful!');
        navigate('/hospitallogin');
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error during signup:', error);
      alert('Something went wrong. Please try again later.');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-signup-form-container">
        <h1 className="admin-signup-title">Admin Sign Up</h1>
        <form className="admin-signup-form" onSubmit={handleSubmit}>
          <div className="admin-form-field">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
              required
              className="admin-input"
            />
          </div>
          <div className="admin-form-field">
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter your username"
              required
              className="admin-input"
            />
          </div>
          <div className="admin-form-field">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
              className="admin-input"
            />
          </div>
          <div className="admin-form-field">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              className="admin-input"
            />
          </div>
          <div className="admin-form-field">
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter your address"
              required
              className="admin-input"
            />
          </div>
          <div className="admin-form-field">
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              placeholder="Enter your contact number"
              required
              className="admin-input"
            />
          </div>
          <div className="admin-form-field">
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleInputChange}
              placeholder="Enter your pincode"
              required
              className="admin-input"
            />
          </div>
          <button type="submit" className="admin-submit-btn">Sign Up</button>
        </form>
      </div>
    </div>
  );
};

export default AdminSignup;
