import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/Auth.css";

const Register = () => {
  const navigate = useNavigate(); //  FIX

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    if (!form.password) newErrors.password = "Password is required";
    if (form.password && form.password.length < 6)
      newErrors.password = "Minimum 6 characters";
    if (form.password !== form.password_confirmation)
      newErrors.password_confirmation = "Passwords do not match";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setLoading(true);
    try {
      await api.post("/register", form);

      // Redirect to login after successful registration
      navigate("/login");

    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors);
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
            <div className="field">
              <label>Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
              {errors.name && <span className="error">{errors.name}</span>}
            </div>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
              {errors.email && <span className="error">{errors.email}</span>}
            </div>

            <div className="field">
              <label>Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder=""
              />
              {errors.phone && <span className="error">{errors.phone}</span>}
            </div>

            <div className="field-inline">
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                />
                {errors.password && (
                  <span className="error">{errors.password}</span>
                )}
              </div>

              <div className="field">
                <label>Confirm</label>
                <input
                  type="password"
                  name="password_confirmation"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  placeholder="Repeat password"
                />
                {errors.password_confirmation && (
                  <span className="error">{errors.password_confirmation}</span>
                )}
              </div>
            </div>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Sign up"}
            </button>

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
