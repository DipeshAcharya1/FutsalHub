import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../api/axios";
import "../styles/UserProfile.css";

const UserProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  
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
    new_password_confirmation: "",
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState({});
  
  // User bookings
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadUserData();
    loadUserBookings();
  }, []);

  const loadUserData = async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login");
      return;
    }
    
    try {
      const response = await api.get("/user/profile");
      if (response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        setProfileForm({
          name: userData.name || "",
          email: userData.email || "",
          phone: userData.phone || "",
        });
        localStorage.setItem("user", JSON.stringify(userData));
      }
    } catch (err) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setProfileForm({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
      });
    }
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPEG, PNG, JPG, GIF images allowed");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post("/user/avatar", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        showSuccess("Avatar updated");
        const updatedUser = { ...user, avatar: response.data.avatar_url };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm("Delete profile picture?")) return;
    
    setUploading(true);
    try {
      const response = await api.delete("/user/avatar");
      if (response.data.success) {
        showSuccess("Avatar deleted");
        const updatedUser = { ...user, avatar: null };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete");
    } finally {
      setUploading(false);
    }
  };

  const validateProfile = () => {
    const errors = {};
    if (!profileForm.name.trim()) errors.name = "Name is required";
    if (!profileForm.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(profileForm.email)) errors.email = "Email is invalid";
    if (!profileForm.phone.trim()) errors.phone = "Phone is required";
    else if (!/^\d+$/.test(profileForm.phone)) errors.phone = "Only digits allowed";
    return errors;
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordForm.current_password) errors.current_password = "Current password required";
    if (!passwordForm.new_password) errors.new_password = "New password required";
    else if (passwordForm.new_password.length < 6) errors.new_password = "Minimum 6 characters";
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      errors.new_password_confirmation = "Passwords do not match";
    }
    return errors;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const errors = validateProfile();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.put("/user/profile", profileForm);
      if (response.data.success) {
        const updatedUser = { ...user, ...profileForm };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        showSuccess("Profile updated");
        setFormErrors({});
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
      } else {
        setError("Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errors = validatePassword();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/user/change-password", passwordForm);
      if (response.data.success) {
        setPasswordForm({
          current_password: "",
          new_password: "",
          new_password_confirmation: "",
        });
        showSuccess("Password changed");
        setActiveTab("profile");
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
      } else {
        setError("Failed to change password");
      }
    } finally {
      setLoading(false);
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
          <div className="profile-header">
            <h1>My Account</h1>
          </div>

          {error && <div className="msg msg-error">{error}</div>}
          {successMsg && <div className="msg msg-success">{successMsg}</div>}

          <div className="profile-tabs">
            <button className={`tab-btn ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}>
              Profile Info
            </button>
            <button className={`tab-btn ${activeTab === "password" ? "active" : ""}`} onClick={() => setActiveTab("password")}>
              Change Password
            </button>
            <button className={`tab-btn ${activeTab === "bookings" ? "active" : ""}`} onClick={() => setActiveTab("bookings")}>
              My Bookings
            </button>
          </div>

          <div className="profile-content">
            {activeTab === "profile" && (
              <div className="profile-card">
                <div className="avatar-section">
                  <div className="avatar-container" onClick={handleAvatarClick}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="avatar-img" />
                    ) : (
                      <div className="avatar-placeholder">{user.name?.charAt(0).toUpperCase()}</div>
                    )}
                    {uploading && <div className="avatar-loading"></div>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                  <div className="avatar-buttons">
                    <button type="button" className="avatar-btn upload" onClick={handleAvatarClick} disabled={uploading}>
                      📷 Upload
                    </button>
                    {user.avatar && (
                      <button type="button" className="avatar-btn delete" onClick={handleDeleteAvatar} disabled={uploading}>
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="profile-form">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} className={formErrors.name ? "error" : ""} />
                    {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} className={formErrors.email ? "error" : ""} />
                    {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} className={formErrors.phone ? "error" : ""} />
                    {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "password" && (
              <div className="profile-card">
                <h3>Change Password</h3>
                <form onSubmit={handlePasswordChange} className="profile-form">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})} className={formErrors.current_password ? "error" : ""} />
                    {formErrors.current_password && <span className="error-text">{formErrors.current_password}</span>}
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})} className={formErrors.new_password ? "error" : ""} />
                    {formErrors.new_password && <span className="error-text">{formErrors.new_password}</span>}
                  </div>

                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" value={passwordForm.new_password_confirmation} onChange={(e) => setPasswordForm({...passwordForm, new_password_confirmation: e.target.value})} className={formErrors.new_password_confirmation ? "error" : ""} />
                    {formErrors.new_password_confirmation && <span className="error-text">{formErrors.new_password_confirmation}</span>}
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Changing..." : "Change Password"}
                  </button>
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
                          <span className={`status-badge ${booking.status}`}>{booking.status}</span>
                        </div>
                        <div className="booking-details">
                          <p><strong>Date:</strong> {formatDate(booking.booking_date)}</p>
                          <p><strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
                          <p><strong>Price:</strong> Rs. {booking.price}</p>
                          <p><strong>Payment:</strong> <span className={`payment-status ${booking.payment_status}`}>{booking.payment_status}</span></p>
                        </div>
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