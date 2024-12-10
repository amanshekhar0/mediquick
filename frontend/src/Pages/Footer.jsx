import React from 'react';
import '../App.css'; // Import the CSS file

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <h2 className="footer-title">MediEquip</h2>
        <p className="footer-text">Made with 🖥️ by TEAM KUCHU PUCHU</p>
        <p className="footer-text">© {new Date().getFullYear()} MediEquip. All Rights Reserved.</p>
        <p className="footer-text">Powered by CMR Institute of Technology</p>
      </div>
    </footer>
  );
};

export default Footer;
