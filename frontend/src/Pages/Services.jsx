import React from "react";
import { useNavigate, NavLink } from "react-router-dom"; // Import useNavigate for redirection
import "../App.css"; // Import the CSS file

// Sample images for the service cards (You can replace with actual images)
import data from "../assets/data.jpeg"; // Book and Buy image
import detail from "../assets/detail.jpeg"; // Check Availability image
import location from "../assets/location.jpeg"; // Locate Equipment image

const Services = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    const isLoggedIn = localStorage.getItem("username");
    if (!isLoggedIn) {
      alert("You must log in first!");
      navigate("/userlogin"); // Redirect to login if not logged in
    } else {
      navigate(path); // Proceed with the intended navigation if logged in
    }
  };
  

  return (
    <section id="services" className="services-container">
      <h1 className="services-heading">Our Services</h1>

      <div className="services-cards">
        <div className="service-card" onClick={() => handleNavigation("/search")}>
          <div className="service-image-container">
            <img src={data} alt="Book and Buy" className="service-image" />
          </div>
          <h2 className="service-title">Book and Buy</h2>
          <p className="service-description">
            Reserve or purchase medical equipment directly through our platform with ease.
          </p>
        </div>

        <div className="service-card" onClick={() => handleNavigation("/search")}>
          <div className="service-image-container">
            <img src={detail} alt="Check Availability" className="service-image" />
          </div>
          <h2 className="service-title">Check Availability</h2>
          <p className="service-description">
            Access real-time information about the availability of medical items at different locations.
          </p>
        </div>

        <div className="service-card" onClick={() => handleNavigation("/search")}>
          <div className="service-image-container">
            <img src={location} alt="Locate Equipment" className="service-image" />
          </div>
          <h2 className="service-title">Locate Medical Equipment</h2>
          <p className="service-description">
            Instantly find hospitals and clinics nearby that have the medical equipment you need.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Services;