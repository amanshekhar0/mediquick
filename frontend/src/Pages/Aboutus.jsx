import React from "react";
import "../App.css"; // Ensure to import the CSS file
import AboutUsImg from "../assets/aboutus.jpeg"; // Correct path for the image

const Aboutus = () => {
  return (
    <section id="aboutus" className="aboutus-container">
      <div className="aboutus-content">
        {/* Image Section */}
        <div className="image-section">
          <img
            src={AboutUsImg}
            alt="Medical Equipment"
            className="aboutus-img"
          />
        </div>

        {/* Text Section */}
        <div className="text-section">
          <h1 className="aboutus-heading">About Us</h1>
          <p className="aboutus-description">
            Our platform is highly feasible, leveraging GPS and real-time data
            to efficiently identify nearby medical resources. It integrates
            seamlessly with existing hospital inventory systems, offering an
            intuitive interface for updates and bookings. With support from
            existing logistics networks, it addresses a critical healthcare
            need, ensuring demand and scalability.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Aboutus;
