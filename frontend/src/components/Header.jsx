import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Header.css";

const Header = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <header className="home-header">
      <div className="home-left">
        <Link to="/" className="home-logo">
          Futsal Hub
        </Link>
      </div>

      <button
        className="nav-toggle"
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hamburger" />
      </button>

      <nav className={`home-nav ${open ? "open" : ""}`}>
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/futsals" className="nav-link">Futsals</Link>
        <Link to="/bookings" className="nav-link">My Bookings</Link>

        {user ? (
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        ) : (
          <Link to="/login" className="nav-link login-btn">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header;