import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaPhoneAlt, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import calculateDiance from "./location.js"; // Ensure this function is properly exported and works as expected.
import "./SearchPage.css";

const SearchPage = () => {
  const [serviceData, setServiceData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);
  const [calculatedDistances, setCalculatedDistances] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "https://xnv54w0n-8080.inc1.devtunnels.ms/api/services"
        );
        setServiceData(response.data);
  
        // Calculate distances for all services
        const distances = {};
        for (const service of response.data) {
          const { distance, duration } = await calculateDiance(
            "janakpuri, delhi",
            service.address
          );
          distances[service._id] = { distance, duration };
        }
        setCalculatedDistances(distances);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    fetchData();
  }, []);
  

  const filteredServices = serviceData.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCall = (phoneNumber) => {
    window.location.href = `tel:${phoneNumber}`; // Opens the dialer with the number
  };

  const handleBookService = async (serviceId, quantity) => {
    try {
      await axios.put(
        `https://xnv54w0n-8080.inc1.devtunnels.ms/api/services/booking/${serviceId}`,
        { quantity: Number(quantity) }
      );
      alert("Service booked successfully!");
    } catch (error) {
      alert("There was an error while booking the service.");
    }
  };

  const handleAddMore = () => {
    setVisibleCount(visibleCount + 5); // Add 5 more cards
  };

  return (
    <div className="search-page">
      <div className="search-page-header">
        <Link to="/" className="back-button">
          <FaArrowLeft className="back-icon" />
        </Link>
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search for services..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="search-icon-container">
          <FaSearch className="search-icon" />
        </div>
      </div>

      <div className="service-cards-container">
        {filteredServices.slice(0, visibleCount).map((service) => (
          <div className="service-card" key={service._id}>
            <img
              src={service.picture}
              alt={service.name}
              className="service-card-img"
            />
            <div className="service-card-content">
              <h3 className="service-card-title">{service.name}</h3>
              <p className="service-category">Category: {service.category}</p>
              <p className="service-price">Price: ${service.price}</p>
              {/* <p className="service-location">
                Location: {service.username.address}
              </p> */}
              <p className="service-quantity">
                Quantity Available: {service.quantity}
              </p>
              <p className="service-calculated-value">
  Distance: {calculatedDistances[service._id]?.distance 
    ? `${Math.floor(calculatedDistances[service._id]?.distance / 100000)} km` 
    : "Calculating..."}
</p>
<p className="service-duration">
  Duration: {calculatedDistances[service._id]?.duration 
    ? `${Math.floor(calculatedDistances[service._id]?.duration / 46000)} hrs` 
    : "Calculating..."}
</p>


              <div className="button-group">
                <button
                  className="call-btn"
                  onClick={() => handleCall(service.phoneNumber)}
                >
                  <FaPhoneAlt className="call-icon" /> Call
                </button>
                <button
                  className="book-btn"
                  onClick={() =>
                    handleBookService(service._id, service.quantity)
                  }
                >
                  Book
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="add-more-container">
        <button className="add-more-btn" onClick={handleAddMore}>
          Add More
        </button>
      </div>
    </div>
  );
};

export default SearchPage;
