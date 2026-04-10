import React from "react";
import { Link, useNavigate } from "react-router-dom";

const AdminNavbar = ({ user, futsalInfo, futsalActive, tab, setTab }) => {
  const navigate = useNavigate();

  const tabs = [
    ["overview", "Overview"],
    ["slots", "Futsal Slots"],
    ["bookings", "Bookings"],
    ["payments", "Payments"],
    ["users", "Users"],
    ["reviews", "Reviews"],
    ["reports", "Reports"],
  ];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="admin-navbar">
      <div className="nav-container">
        <div className="nav-brand">FutsalHub Admin</div>
        
        <div className="nav-tabs">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={`nav-tab ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
          <Link to="/futsals" className="nav-tab public-link">
            Public Listings
          </Link>
        </div>

        <div className="nav-user">
          <div className="user-info">
            <span className="user-name">{user?.name || "Admin"}</span>
            <span className="futsal-name">
              {futsalInfo?.futsal_name || "Loading..."}
              {!futsalActive && futsalInfo && (
                <span className="deactivated-badge"> (Deactivated)</span>
              )}
            </span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;