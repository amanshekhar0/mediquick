import React, { useState } from "react";
import "./EqiupmentForm.css"

const EquipmentForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    price: "",
    location: "",
    contact: "",
    picture: "", // Picture URL field
    category: "equipment", // Default category as equipment
    username: localStorage.getItem("username") , // Username (assumed to be an ObjectId)
  });
  // console.log(localStorage.getItem("username"));

  const [isLoading, setIsLoading] = useState(false);

  // Replace this with your actual backend API URL
  const API_URL = "https://xnv54w0n-8080.inc1.devtunnels.ms/api/services";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Ensure the form data is correctly sent to the backend
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData), // Send the formData directly
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Form Submitted Successfully:", result);
        alert("Equipment added successfully!");

        // Clear the form after successful submission
        setFormData({
          name: "",
          quantity: "",
          price: "",
          location: "",
          contact: "",
          picture: "", // Reset picture field as well
          category: "equipment",
          username: localStorage.getItem("user"), // Keep username if present
        });
      } else {
        const errorData = await response.json();
        console.error("Error Submitting Form:", errorData);
        alert(`Error: ${errorData.message || "Failed to submit data"}`);
      }
    } catch (error) {
      console.error("Network Error:", error);
      alert("Failed to connect to the backend. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Fill the Details</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Equipment Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter equipment or medicine name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="quantity">Quantity:</label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            placeholder="Enter quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="price">Price:</label>
          <input
            type="number"
            id="price"
            name="price"
            placeholder="Enter price"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location:</label>
          <input
            type="text"
            id="location"
            name="location"
            placeholder="Enter location or address"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="contact">Contact Number:</label>
          <input
            type="tel"
            id="contact"
            name="contact"
            placeholder="Enter contact number"
            value={formData.contact}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="picture">Picture URL:</label>
          <input
            type="url"
            id="picture"
            name="picture"
            placeholder="Enter picture URL"
            value={formData.picture}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="equipment">Equipment</option>
            <option value="medicine">Medicine</option>
          </select>
        </div>

        <div className="form-group">
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EquipmentForm;