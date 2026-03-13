import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../api/axios";
import "../styles/UserProfile.css";

const UserProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile"); // profile, password, bookings
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  
  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState({});
  
  // User bookings
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    loadUserData();
    loadUserBookings();
  }, []);

  const loadUserData = () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login");
      return;
    }
    
    const userData = JSON.parse(userStr);
    setUser(userData);
    setProfileForm({
      name: userData.name || "",
      email: userData.email || "",
      phone: userData.phone || "",
    });
  };

  const loadUserBookings = async () => {
    setBookingsLoading(true);
    try {
      const response = await api.get("/user/bookings");
      setBookings(response.data.data || []);
    } catch (err) {
      console.error("Failed to load bookings:", err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Validate profile form
  const validateProfile = () => {
    const errors = {};
    if (!profileForm.name.trim()) errors.name = "Name is required";
    if (!profileForm.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(profileForm.email)) errors.email = "Email is invalid";
    return errors;
  };

  // Validate password form
  const validatePassword = () => {
    const errors = {};
    if (!passwordForm.current_password) errors.current_password = "Current password is required";
    if (!passwordForm.new_password) errors.new_password = "New password is required";
    else if (passwordForm.new_password.length < 6) errors.new_password = "Password must be at least 6 characters";
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = "Passwords do not match";
    }
    return errors;
  };

  // Update profile
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const errors = validateProfile();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.put("/user/profile", profileForm);
      
      if (response.data.success) {
        const updatedUser = { ...user, ...profileForm };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        showSuccess("Profile updated successfully");
        setFormErrors({});
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errors = validatePassword();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post("/user/change-password", passwordForm);
      
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setFormErrors({});
      showSuccess("Password changed successfully");
      setActiveTab("profile");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  // Cancel booking
  const cancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      showSuccess("Booking cancelled successfully");
      loadUserBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel booking");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (!user) {
    return (
      <div className="profile-page">
        <Header />
        <main className="profile-main">
          <div className="loading-container">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Header />

      <main className="profile-main">
        <div className="profile-container">
          {/* Header */}
          <div className="profile-header">
            <h1>My Account</h1>
          </div>

          {/* Messages */}
          {error && <div className="msg msg-error">{error}</div>}
          {successMsg && <div className="msg msg-success">{successMsg}</div>}

          {/* Profile Tabs */}
          <div className="profile-tabs">
            <button
              className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              Profile Info
            </button>
            <button
              className={`tab-btn ${activeTab === "password" ? "active" : ""}`}
              onClick={() => setActiveTab("password")}
            >
              Change Password
            </button>
            <button
              className={`tab-btn ${activeTab === "bookings" ? "active" : ""}`}
              onClick={() => setActiveTab("bookings")}
            >
              My Bookings
            </button>
          </div>

          {/* Profile Tab Content */}
          <div className="profile-content">
            {activeTab === "profile" && (
              <div className="profile-card">
                <div className="profile-avatar">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                
                <form onSubmit={handleProfileUpdate} className="profile-form">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      className={formErrors.name ? "error" : ""}
                    />
                    {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      className={formErrors.email ? "error" : ""}
                    />
                    {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      placeholder="e.g. 9800000000"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "password" && (
              <div className="profile-card">
                <h3>Change Password</h3>
                
                <form onSubmit={handlePasswordChange} className="profile-form">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                      className={formErrors.current_password ? "error" : ""}
                    />
                    {formErrors.current_password && (
                      <span className="error-text">{formErrors.current_password}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                      className={formErrors.new_password ? "error" : ""}
                    />
                    {formErrors.new_password && (
                      <span className="error-text">{formErrors.new_password}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                      className={formErrors.confirm_password ? "error" : ""}
                    />
                    {formErrors.confirm_password && (
                      <span className="error-text">{formErrors.confirm_password}</span>
                    )}
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? "Changing..." : "Change Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="profile-card">
                <h3>My Bookings</h3>
                
                {bookingsLoading ? (
                  <p className="loading-text">Loading bookings...</p>
                ) : bookings.length === 0 ? (
                  <p className="empty-text">No bookings found.</p>
                ) : (
                  <div className="bookings-list">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="booking-item">
                        <div className="booking-header">
                          <h4>{booking.futsal_name}</h4>
                          <span className={`status-badge ${booking.status}`}>
                            {booking.status}
                          </span>
                        </div>
                        
                        <div className="booking-details">
                          <p>
                            <strong>Date:</strong> {formatDate(booking.booking_date)}
                          </p>
                          <p>
                            <strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </p>
                          <p>
                            <strong>Price:</strong> Rs. {booking.price}
                          </p>
                          <p>
                            <strong>Payment:</strong> 
                            <span className={`payment-status ${booking.payment_status}`}>
                              {booking.payment_status}
                            </span>
                          </p>
                        </div>
                        
                        {booking.status === "pending" && (
                          <button
                            className="cancel-btn"
                            onClick={() => cancelBooking(booking.id)}
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserProfile;