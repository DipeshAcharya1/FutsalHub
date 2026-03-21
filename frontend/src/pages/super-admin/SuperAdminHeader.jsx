import React from "react";

const SuperAdminHeader = ({ onLogout }) => {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  return (
    <header className="super-admin-header">
      <div className="header-left">
        <h1>Super Admin Dashboard</h1>
        <span className="admin-badge">Super Admin</span>
      </div>
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user?.name || "Super Admin"}</span>
          <span className="user-email">{user?.email || ""}</span>
        </div>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </header>
  );
};

export default SuperAdminHeader;