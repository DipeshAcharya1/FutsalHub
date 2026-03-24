import React from "react";
import { Link } from "react-router-dom";
import "../styles/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-brand">Futsal Hub</h3>
          <p>
            Book futsals easily, check availability, and manage your games
            with a modern, user-friendly interface.
          </p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/futsals">Futsals</Link></li>
            <li><Link to="/login">Login</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact Us</h4>
          <p>Email: support@futsalhub.com</p>
          <p>Phone: +977 9800000000</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Futsal Hub. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;