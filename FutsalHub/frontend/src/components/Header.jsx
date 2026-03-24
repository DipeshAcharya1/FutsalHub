import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/Header.css";

const Header = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");
    
    if (!token || !storedUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/verify-token');
      if (response.data.valid) {
        setUser(JSON.parse(storedUser));
      } else {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login");
    }
  };

  if (loading) return null;

  return (
    <header className="home-header">
      <div className="home-left">
        <Link to="/" className="home-logo">
          Futsal Hub
        </Link>
      </div>

      <button
        className="nav-toggle"
        onClick={() => setOpen(!open)}
      >
        <span className={`hamburger ${open ? "open" : ""}`} />
      </button>

      <nav className={`home-nav ${open ? "open" : ""}`}>
        <Link to="/" className="nav-link" onClick={() => setOpen(false)}>Home</Link>
        <Link to="/futsals" className="nav-link" onClick={() => setOpen(false)}>Futsals</Link>
        
        {user ? (
          <>
            <Link to="/profile" className="nav-link profile-link" onClick={() => setOpen(false)}>
              <span className="profile-icon">👤</span>
              Profile
            </Link>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-link login-btn" onClick={() => setOpen(false)}>
            Login
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header;