import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Header.css";

const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="home-header">
      <div className="home-left">
        <div className="home-logo">Futsal Hub</div>
      </div>

      <button
        className="nav-toggle"
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hamburger" />
      </button>

      <nav className={`home-nav ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        <Link to="/" className="nav-link">
          Home
        </Link>
        <Link to="/futsals" className="nav-link">
          Futsals
        </Link>
        <Link to="/bookings" className="nav-link">
          My Bookings
        </Link>
        <Link to="/login" className="nav-link login-btn">
          Login
        </Link>
      </nav>
    </header>
  );
};

export default Header;
