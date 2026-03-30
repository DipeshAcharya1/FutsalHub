import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../api/axios";
import "../styles/UserProfile.css";

const UserProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [user, setUser] = useState(null);
  
  // Get active tab from URL query parameter
  const getActiveTabFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'profile' || tab === 'password' || tab === 'bookings') {
      return tab;
    }
    return 'profile';
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTabFromUrl);
  
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
  const [cancelling, setCancelling] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Update URL when tab changes
  const updateTabInUrl = (tab) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    updateTabInUrl(tab);
  };

  useEffect(() => {
    loadUserData();
    loadUserBookings();
  }, []);

  // Re-read tab from URL when location changes (for browser back/forward)
  useEffect(() => {
    const tabFromUrl = getActiveTabFromUrl();
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

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
      if (response.data.success) {
        setBookings(response.data.data || []);
      }
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
        showSuccess("Password changed successfully");
        setFormErrors({});
        // Stay on same tab - no redirect
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

  const handleCancelBooking = async (booking) => {
    setSelectedBooking(booking);
    setShowConfirmModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedBooking) return;
    
    setCancelling(selectedBooking.id);
    setError(null);
    
    try {
      let response;
      
      if (selectedBooking.status === 'confirmed') {
        response = await api.post(`/bookings/${selectedBooking.id}/refund`);
      } else {
        response = await api.patch(`/bookings/${selectedBooking.id}/cancel`);
      }
      
      if (response.data.success) {
        await loadUserBookings();
        setShowConfirmModal(false);
        setSelectedBooking(null);
        alert(response.data.message);
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString();
  };

  const getStatusBadge = (booking) => {
    if (booking.status === 'cancelled') {
      if (booking.refund_status === 'completed') {
        return <span className="status-badge refunded">Refunded</span>;
      }
      return <span className="status-badge cancelled">Cancelled</span>;
    }
    if (booking.is_past) {
      return <span className="status-badge completed">Completed</span>;
    }
    return <span className="status-badge confirmed">Confirmed</span>;
  };

  const getRefundDisplay = (booking) => {
    if (booking.status !== 'cancelled') return null;
    
    if (booking.refund_status === 'completed') {
      return (
        <div className="refund-info">
          <span className="refund-label">Refund</span>
          <span className="refund-amount">Rs. {booking.refund_amount} refunded</span>
        </div>
      );
    }
    if (booking.refund_status === 'pending') {
      return (
        <div className="refund-info pending">
          <span className="refund-label">Refund</span>
          <span className="refund-status-pending">Processing</span>
        </div>
      );
    }
    if (booking.refund_status === 'failed') {
      return (
        <div className="refund-info failed">
          <span className="refund-label">Refund</span>
          <span className="refund-status-failed">Failed - Contact support</span>
        </div>
      );
    }
    return null;
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
            <button 
              className={`tab-btn ${activeTab === "profile" ? "active" : ""}`} 
              onClick={() => handleTabChange("profile")}
            >
              Profile Info
            </button>
            <button 
              className={`tab-btn ${activeTab === "password" ? "active" : ""}`} 
              onClick={() => handleTabChange("password")}
            >
              Change Password
            </button>
            <button 
              className={`tab-btn ${activeTab === "bookings" ? "active" : ""}`} 
              onClick={() => handleTabChange("bookings")}
            >
              My Bookings
            </button>
          </div>

          <div className="profile-content">
            {/* Profile Info Tab */}
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
                      className={formErrors.phone ? "error" : ""} 
                    />
                    {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            )}

            {/* Change Password Tab */}
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
                    {formErrors.current_password && <span className="error-text">{formErrors.current_password}</span>}
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input 
                      type="password" 
                      value={passwordForm.new_password} 
                      onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})} 
                      className={formErrors.new_password ? "error" : ""} 
                    />
                    {formErrors.new_password && <span className="error-text">{formErrors.new_password}</span>}
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                      type="password" 
                      value={passwordForm.new_password_confirmation} 
                      onChange={(e) => setPasswordForm({...passwordForm, new_password_confirmation: e.target.value})} 
                      className={formErrors.new_password_confirmation ? "error" : ""} 
                    />
                    {formErrors.new_password_confirmation && <span className="error-text">{formErrors.new_password_confirmation}</span>}
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Changing..." : "Change Password"}
                  </button>
                </form>
              </div>
            )}

            {/* My Bookings Tab - Card Layout */}
            {activeTab === "bookings" && (
              <div className="bookings-container">
                {bookingsLoading ? (
                  <div className="loading-container">Loading your bookings...</div>
                ) : bookings.length === 0 ? (
                  <div className="empty-state">
                    <p>No bookings found.</p>
                    <button className="btn-primary" onClick={() => navigate('/futsals')}>
                      Browse Futsals
                    </button>
                  </div>
                ) : (
                  <div className="bookings-grid">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="booking-card">
                        <div className="booking-header">
                          <div>
                            <h3>{booking.futsal_name}</h3>
                            <p className="location">{booking.location}</p>
                          </div>
                          {getStatusBadge(booking)}
                        </div>

                        <div className="booking-details">
                          <div className="detail-item">
                            <span className="detail-label">Date</span>
                            <span className="detail-value">{formatDate(booking.slot_date)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Time</span>
                            <span className="detail-value">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Price</span>
                            <span className="detail-value price">Rs. {booking.price}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Payment</span>
                            <span className="payment-status paid">Paid</span>
                          </div>
                          
                          {getRefundDisplay(booking)}
                        
                        </div>

                        <div className="booking-actions">
                          {booking.status === 'confirmed' && !booking.is_past && booking.can_cancel && (
                            <button 
                              className="btn-cancel"
                              onClick={() => handleCancelBooking(booking)}
                              disabled={cancelling === booking.id}
                            >
                              {cancelling === booking.id ? "Processing..." : "Cancel Booking"}
                            </button>
                          )}
                          
                          <button 
                            className="btn-details"
                            onClick={() => navigate(`/booking/${booking.id}`)}
                          >
                            View Details
                          </button>
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

      {/* Confirmation Modal */}
      {showConfirmModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cancel Booking</h3>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to cancel this booking?</p>
              <div className="booking-summary">
                <p><strong>{selectedBooking.futsal_name}</strong></p>
                <p>{formatDate(selectedBooking.slot_date)} | {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}</p>
                <p>Amount: Rs. {selectedBooking.price}</p>
              </div>
              {selectedBooking.status === 'confirmed' && (
                <div className="refund-info">
                  Refund of Rs. {selectedBooking.price}.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfirmModal(false)}>
                No, Keep It
              </button>
              <button className="btn-danger" onClick={confirmCancel} disabled={cancelling === selectedBooking.id}>
                {cancelling === selectedBooking.id ? 'Processing...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;