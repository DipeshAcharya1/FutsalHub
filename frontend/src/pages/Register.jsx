import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import "../styles/Auth.css";
import GoogleButton from "../components/GoogleButton";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleData, setGoogleData] = useState(null);

  // Check for Google data in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleDataParam = params.get('google_data');
    
    if (googleDataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(googleDataParam));
        setGoogleData(data);
        setForm(prev => ({
          ...prev,
          name: data.name,
          email: data.email,
        }));
      } catch (error) {
        console.error('Failed to parse Google data:', error);
      }
    }
  }, [location]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d+$/.test(form.phone)) {
      newErrors.phone = "Phone number must contain only digits";
    } else if (form.phone.length < 10) {
      newErrors.phone = "Phone number must be at least 10 digits";
    }
    
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    if (form.password !== form.password_confirmation) {
      newErrors.password_confirmation = "Passwords do not match";
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const v = validate();
  setErrors(v);
  if (Object.keys(v).length > 0) return;

  setLoading(true);
  try {
    let requestData = { ...form };
    
    // If coming from Google, include google_id
    if (googleData) {
      requestData.google_id = googleData.google_id;
      requestData.avatar = googleData.avatar;
    }
    
    const response = await api.post("/register", requestData);
    
    // Check if this is a Google registration (auto-login)
    if (response.data.access_token) {
      // Google user - auto login
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      const user = response.data.user;
      if (user.role === "super-admin") {
        navigate("/super-admin");
      } else if (user.role === "admin") {
        navigate(`/admin/${user.futsal_id}`);
      } else {
        navigate("/");
      }
    } else {
      // Regular user - needs email verification
      // Show success message and redirect to login
      alert(response.data.message || "Registration successful! Please check your email to verify your account.");
      navigate("/login");
    }
  } catch (err) {
    if (err.response?.status === 422) {
      setErrors(err.response.data.errors);
    } else if (err.response?.status === 409) {
      setErrors({ email: "Email already exists. Please use a different email." });
    } else {
      setErrors({ general: "Registration failed. Please try again." });
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <h1 className="brand">FutsalHub</h1>
          <p className="brand-subtitle">
            Book your futsal slots quickly with a clean, modern interface.
          </p>
        </div>

        <div className="auth-right">
          <h2 className="auth-title">Create account</h2>
          <p className="auth-subtitle">
            Join and start booking futsal grounds in seconds.
          </p>

          {googleData && (
            <div className="google-info" style={{
              background: "#e8f5e9",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              textAlign: "center",
              fontSize: "14px",
              color: "#2e7d32"
            }}>
              ✓ Google account detected: {googleData.email}<br/>
              Please set your password to complete registration.
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {errors.general && (
              <div className="error-message" style={{ 
                background: "#fee", 
                color: "#c00", 
                padding: "10px", 
                borderRadius: "4px", 
                marginBottom: "15px",
                fontSize: "14px"
              }}>
                {errors.general}
              </div>
            )}

            <div className="field">
              <label>Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={loading || googleData}
              />
              {errors.name && <span className="error">{errors.name}</span>}
            </div>

            <div className="field">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@gmail.com"
                disabled={loading || googleData}
              />
              {errors.email && <span className="error">{errors.email}</span>}
              <small style={{ fontSize: "12px", color: "#666", display: "block", marginTop: "4px" }}>
                Enter a valid email address to receive verification link
              </small>
            </div>

            <div className="field">
              <label>Phone *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                disabled={loading}
              />
              {errors.phone && <span className="error">{errors.phone}</span>}
            </div>

            <div className="field-inline">
              <div className="field">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a password (min 8 characters)"
                  disabled={loading}
                />
                {errors.password && (
                  <span className="error">{errors.password}</span>
                )}
              </div>

              <div className="field">
                <label>Confirm *</label>
                <input
                  type="password"
                  name="password_confirmation"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  disabled={loading}
                />
                {errors.password_confirmation && (
                  <span className="error">{errors.password_confirmation}</span>
                )}
              </div>
            </div>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Sign up"}
            </button>

            <div className="divider">
              <span>or</span>
            </div>
            
            <GoogleButton buttonText="Sign up with Google" isRegister={true} />

            <p className="auth-footer">
              Already have an account?{" "}
              <Link to="/login" className="link">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;