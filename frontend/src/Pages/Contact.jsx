import React from "react";
import { FaPhoneAlt } from "react-icons/fa";

const Contact = () => {
  return (
    <section id="contact" className="contact-wrapper">
      <div className="box-contact">
        <div className="contact-container">
          <h2 className="contact-heading">Contact Nearest Hospital</h2>

          <div className="hospital-info">
            <h3>City General Hospital</h3>
            <p className="hospital-detail"><strong>Contact:</strong> +1 (123) 456-7890</p>
            <p className="hospital-detail"><strong>Timing:</strong> 24/7</p>
            <button className="call-button">
              <FaPhoneAlt className="call-icon" /> Call Now
            </button>
          </div>

          <h3 className="form-heading">Get in Touch</h3>
          <form className="contact-form">
            <div className="form-row">
              <input type="text" placeholder="Your Name" className="form-input" />
              <input type="text" placeholder="Your Phone" className="form-input" />
            </div>

            <div className="form-row">
              <input type="email" placeholder="Your Email" className="form-input full-width" />
            </div>

            <div className="form-row">
              <textarea placeholder="Your Message" rows="5" className="form-textarea"></textarea>
            </div>

            <button type="submit" className="submit-button">Contact Us</button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
