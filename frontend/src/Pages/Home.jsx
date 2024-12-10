import React, { useRef } from "react";
import "../App.css";
import Services from "./Services.jsx"; // Import Services component

const Home = () => {
  const servicesRef = useRef(null);

  const scrollToServices = () => {
    servicesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      {/* First Container: Home Section */}
      <div className="first-container">
        {/* Background Image */}
        <div className="background-overlay">
          {/* Content */}
          <div className="content-container">
            <h1 className="main-heading">RapidCare</h1>
            <p className="sub-heading">
              When seconds count and care's a must, we help you find the equipment you trust.
            </p>
            {/* Book Now Button */}
            <button className="book-btn" onClick={scrollToServices}>
              Book Now
            </button>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div ref={servicesRef}>
        <Services />
      </div>
    </div>
  );
};

export default Home;
