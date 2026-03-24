import { Link } from "react-router-dom";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/Auth.css";
import GoogleButton from "../components/GoogleButton";

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.email.trim()) newErrors.email = "Email is required";
    if (!form.password) newErrors.password = "Password is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  const v = validate();
  setErrors(v);
  if (Object.keys(v).length > 0) return;

  setLoading(true);
  try {
    const res = await api.post("/login", form);

    // Store token & user
    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

    // Redirect based on role
    const user = res.data.user;
    if (user.role === "super-admin") {
      navigate("/super-admin");
    } else if (user.role === "admin") {
      navigate(`/admin/${user.futsal_id}`); // Assuming admin has futsal_id
    } else {
      navigate("/home");
    }
  } catch (err) {
    if (err.response?.status === 401) {
      setErrors({ password: err.response.data.message });
    } else if (err.response?.status === 422) {
      setErrors(err.response.data.errors);
    } else {
      setErrors({ general: "Login failed. Please try again." });
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
            Welcome back. Manage your futsal bookings in one place.
          </p>
        </div>

        <div className="auth-right">
          <h2 className="auth-title">Log in</h2>
          <p className="auth-subtitle">
            Enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
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
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder=""
              />
              {errors.password && (
                <span className="error">{errors.password}</span>
              )}
            </div>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>

            <p className="auth-footer">
              Don't have an account?{" "}
              <Link to ="/register" className="link">
                Sign up
              </Link>
            </p>
          </form>
          <Link to="/forgot-password">Forgot Password?</Link>
          <GoogleButton />
        </div>
      </div>
    </div>
  );
};

export default Login;
