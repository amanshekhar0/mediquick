import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminDashBoard.css";

const AdminDashBoard = () => {
  const [equipmentData, setEquipmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantities, setQuantities] = useState({});
  const id = localStorage.getItem("username");

  const API_URL = `https://xnv54w0n-8080.inc1.devtunnels.ms/api/services/${id}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result)) {
            setEquipmentData(result);
          } else {
            setError("Data format error: Expected an array.");
          }
        } else {
          setError("Failed to fetch equipment data.");
        }
      } catch (error) {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const modify = async ({ equipment, equipmentQuantity }) => {
    try {
      const serviceId = equipment._id;
      const response = await axios.put(
        `https://xnv54w0n-8080.inc1.devtunnels.ms/api/services/${serviceId}`,
        { quantity: Number(equipmentQuantity) }
      );
      if (response.status === 200) {
        console.log("Quantity updated successfully!");
      } else {
        console.log("Error updating quantity:", response.status);
      }
    } catch (err) {
      console.log("Error while modifying quantity:", err);
    }
  };

  const handleQuantityChange = (e, equipmentId) => {
    const value = e.target.value;
    if (value >= 0) {
      setQuantities((prevQuantities) => ({
        ...prevQuantities,
        [equipmentId]: value,
      }));
    }
  };

  if (loading) {
    return (
      <div className="main-page">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-page">
        <h1>{error}</h1>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="header-admin">
        <button
          className="home-icon"
          onClick={() => (window.location.href = "/")}
        >
          🏠
        </button>
        <navDet>
          <h2>
            Available &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Equipment
            &nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;and
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Medicines
          </h2>
        </navDet>
      </header>
      <div className="cards-container">
        {equipmentData.map((equipment) => {
          const imageUrl = equipment.picture
            ? `${equipment.picture}`
            : "https://via.placeholder.com/150";
          const equipmentQuantity =
            quantities[equipment._id] || equipment.quantity;
          const isShortage = equipmentQuantity < 10;

          return (
            <div className="equipment-card" key={equipment._id}>
              <img
                src={imageUrl}
                alt={equipment.name}
                onError={(e) =>
                  (e.target.src = "https://via.placeholder.com/150")
                }
              />
              <h3>{equipment.name}</h3>
              <p>Quantity: {equipment.quantity}</p>
              <p>Price: ₹{equipment.price}</p>
              <p>Location: {equipment.username.address}</p>
              <p>Contact: {equipment.username.contact}</p>
              <p>Category: {equipment.category}</p>
              {isShortage && <p className="shortage-alert">Shortage Alert!</p>}
              <input
                type="number"
                value={equipmentQuantity}
                onChange={(e) => handleQuantityChange(e, equipment._id)}
                placeholder="Enter Quantity"
              />
              <button onClick={() => modify({ equipment, equipmentQuantity })}>
                Change
              </button>
            </div>
          );
        })}
      </div>
      <div className="add-eqp-btn">
        <button
          onClick={() => (window.location.href = "/add-equipment")}
          className="add-equipment-button"
        >
          Add Equipment
        </button>
      </div>
    </div>
  );
};

export default AdminDashBoard;
