import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../api/axios";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  const email = params.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      navigate("/forgot-password");
    }
  }, [token, email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/reset-password", {
        email,
        token,
        password,
        password_confirmation: confirmPassword
      });
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h1>Reset Password</h1>
      
      {!success ? (
        <>
          {error && <p style={{ color: "red", background: "#ffeeee", padding: "10px", borderRadius: "4px" }}>{error}</p>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                required
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: "100%", 
                padding: "10px", 
                background: "#3498db", 
                color: "white", 
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <Link to="/login" style={{ color: "#3498db", textDecoration: "none" }}>← Back to Login</Link>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#27ae60" }}>✓ Password Reset Successful!</h2>
          <p>Redirecting to login...</p>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;