import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/Auth.css";
import GoogleButton from "../components/GoogleButton";

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validateEmail = async (email) => {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    
    const domain = email.split('@')[1].toLowerCase();
    const obviousFakes = ['test.com', 'example.com', 'temp.com', 'fake.com', 'dummy.com'];
    if (obviousFakes.includes(domain)) {
      return "Please use a real email address";
    }
    
    try {
      setCheckingEmail(true);
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
      const data = await response.json();
      
      if (data.Answer && data.Answer.length > 0) {
        return null;
      } else {
        return "This email domain does not exist. Please use a real email address.";
      }
    } catch (error) {
      console.log("Could not verify domain");
      return null;
    } finally {
      setCheckingEmail(false);
    }
  };

  const validate = async () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const emailError = await validateEmail(form.email);
      if (emailError) newErrors.email = emailError;
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

  const v = await validate();
  setErrors(v);
  if (Object.keys(v).length > 0) return;

  setLoading(true);
  try {
    const response = await api.post("/register", form);
    
    // Store token
    localStorage.setItem("access_token", response.data.access_token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    
    // Redirect to verification notice
    navigate("/verify-email-notice");
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
          <h1 className="brand">FutsalBook</h1>
          <p className="brand-subtitle">
            Book your futsal slots quickly with a clean, modern interface.
          </p>
        </div>

        <div className="auth-right">
          <h2 className="auth-title">Create account</h2>
          <p className="auth-subtitle">
            Join and start booking futsal grounds in seconds.
          </p>

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
                disabled={loading || checkingEmail}
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
                disabled={loading || checkingEmail}
              />
              {checkingEmail && (
                <span className="info" style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "4px" }}>
                  Verifying email...
                </span>
              )}
              {errors.email && <span className="error">{errors.email}</span>}
              <small style={{ fontSize: "12px", color: "#666", display: "block", marginTop: "4px" }}>
                Enter a real email address (will be verified)
              </small>
            </div>

            <div className="field">
              <label>Phone *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                disabled={loading || checkingEmail}
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
                  disabled={loading || checkingEmail}
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
                  disabled={loading || checkingEmail}
                />
                {errors.password_confirmation && (
                  <span className="error">{errors.password_confirmation}</span>
                )}
              </div>
            </div>

            <button className="primary-btn" type="submit" disabled={loading || checkingEmail}>
              {loading ? "Creating account..." : checkingEmail ? "Verifying email..." : "Sign up"}
            </button>

            {/* Google Sign Up Button */}
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