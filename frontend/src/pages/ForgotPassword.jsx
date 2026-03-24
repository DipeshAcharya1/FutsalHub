import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [debugLink, setDebugLink] = useState(null); // For testing with LOG driver

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/forgot-password", { email });
      console.log("Response:", response.data);
      
      if (response.data.success) {
        setSuccess(true);
        // If debug link is provided (for LOG driver testing)
        if (response.data.debug_link) {
          setDebugLink(response.data.debug_link);
        }
      }
    } catch (err) {
      console.error("Error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      <h1>Forgot Password?</h1>
      
      {!success ? (
        <>
          <p>Enter your email to receive a reset link.</p>
          {error && <p style={{ color: "red", background: "#ffeeee", padding: "10px", borderRadius: "4px" }}>{error}</p>}
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "10px", marginBottom: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
              required
            />
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
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <Link to="/login" style={{ color: "#3498db", textDecoration: "none" }}>← Back to Login</Link>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#27ae60" }}>✓ Check Your Email</h2>
          <p>We've sent a reset link to <strong>{email}</strong></p>
          {debugLink && (
            <div style={{ marginTop: "15px", padding: "10px", background: "#f0f0f0", borderRadius: "4px" }}>
              <p style={{ fontSize: "12px", color: "#666" }}>
                <strong>Debug Mode:</strong> Click this link to reset password
              </p>
              <a 
                href={debugLink} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: "#3498db", wordBreak: "break-all", fontSize: "12px" }}
              >
                {debugLink}
              </a>
            </div>
          )}
          <Link to="/login" style={{ color: "#3498db", textDecoration: "none", display: "inline-block", marginTop: "20px" }}>
            Back to Login
          </Link>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;