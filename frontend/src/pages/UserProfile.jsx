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
  
  const getActiveTabFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'profile' || tab === 'password' || tab === 'bookings') {
      return tab;
    }
    return 'profile';
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTabFromUrl);
  
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [bookings, setBookings] = useState([]);
  const [groupedBookings, setGroupedBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [cancellingBulk, setCancellingBulk] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedBulkGroup, setSelectedBulkGroup] = useState(null);

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

  useEffect(() => {
    const tabFromUrl = getActiveTabFromUrl();
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  // Group bookings when they change
  useEffect(() => {
    groupBookingsByBulk();
  }, [bookings]);

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
      setError("Failed to load bookings");
    } finally {
      setBookingsLoading(false);
    }
  };

  const groupBookingsByBulk = () => {
    const bulkGroups = {};
    const singleBookings = [];

    bookings.forEach(booking => {
      if (booking.bulk_booking_id && booking.is_bulk_booking) {
        if (!bulkGroups[booking.bulk_booking_id]) {
          bulkGroups[booking.bulk_booking_id] = {
            id: booking.bulk_booking_id,
            is_bulk: true,
            bookings: [],
            total_amount: booking.total_amount || 0,
            total_slots: booking.total_slots || 0,
            futsal_name: booking.futsal_name,
            location: booking.location,
            can_cancel_all: true,
            has_cancelled: false
          };
        }
        bulkGroups[booking.bulk_booking_id].bookings.push(booking);
        if (booking.status !== 'confirmed') {
          bulkGroups[booking.bulk_booking_id].has_cancelled = true;
        }
        if (!booking.can_cancel || booking.status !== 'confirmed') {
          bulkGroups[booking.bulk_booking_id].can_cancel_all = false;
        }
      } else {
        singleBookings.push(booking);
      }
    });

    // Check if all bookings in bulk group can be cancelled
    Object.values(bulkGroups).forEach(group => {
      let allCancellable = true;
      group.bookings.forEach(booking => {
        if (!booking.can_cancel || booking.status !== 'confirmed') {
          allCancellable = false;
        }
      });
      group.can_cancel_all = allCancellable;
    });

    setGroupedBookings([...Object.values(bulkGroups), ...singleBookings]);
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
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
        showSuccess("Avatar updated successfully");
        const updatedUser = { ...user, avatar: response.data.avatar_url };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm("Are you sure you want to delete your profile picture?")) return;
    
    setUploading(true);
    try {
      const response = await api.delete("/user/avatar");
      if (response.data.success) {
        showSuccess("Avatar deleted successfully");
        const updatedUser = { ...user, avatar: null };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete avatar");
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
        showSuccess("Profile updated successfully");
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

  const handleCancelBooking = (booking) => {
    setSelectedBooking(booking);
    setShowConfirmModal(true);
  };

  const handleBulkCancel = (bulkGroup) => {
    setSelectedBulkGroup(bulkGroup);
    setShowBulkConfirmModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedBooking) return;
    
    setCancelling(selectedBooking.id);
    setError(null);
    
    try {
      const response = await api.post(`/bookings/${selectedBooking.id}/refund`);
      
      if (response.data.success) {
        await loadUserBookings();
        setShowConfirmModal(false);
        setSelectedBooking(null);
        showSuccess(response.data.message);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  const confirmBulkCancel = async () => {
    if (!selectedBulkGroup) return;
    
    setCancellingBulk(selectedBulkGroup.id);
    setError(null);
    
    try {
      const response = await api.post('/bookings/bulk/cancel', {
        bulk_booking_id: selectedBulkGroup.id
      });
      
      if (response.data.success) {
        await loadUserBookings();
        setShowBulkConfirmModal(false);
        setSelectedBulkGroup(null);
        showSuccess(response.data.message);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      console.error('Bulk cancel error:', err);
      setError(err.response?.data?.message || 'Failed to cancel bulk booking');
    } finally {
      setCancellingBulk(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return 'N/A';
    const date = new Date(deadline);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusClass = (booking) => {
    if (booking.status === 'cancelled') {
      if (booking.refund_status === 'completed') return 'status-refunded';
      return 'status-cancelled';
    }
    if (booking.is_past) return 'status-completed';
    return 'status-confirmed';
  };

  const getStatusText = (booking) => {
    if (booking.status === 'cancelled') {
      if (booking.refund_status === 'completed') return 'Refunded';
      return 'Cancelled';
    }
    if (booking.is_past) return 'Completed';
    return 'Confirmed';
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

            {/* My Bookings Tab - TABLE VIEW WITH BULK GROUPING */}
            {activeTab === "bookings" && (
              <div className="bookings-table-container">
                {bookingsLoading ? (
                  <div className="loading-container">Loading your bookings...</div>
                ) : groupedBookings.length === 0 ? (
                  <div className="empty-state">
                    <p>No bookings found.</p>
                    <button className="btn-primary" onClick={() => navigate('/futsals')}>
                      Browse Futsals
                    </button>
                  </div>
                ) : (
                  <div className="bookings-table-wrapper">
                    <table className="bookings-table">
                      <thead>
                        <tr>
                          <th>Futsal</th>
                          <th>Date/Time</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th>Cancel By</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedBookings.map((item, idx) => {
                          if (item.is_bulk) {
                            // Render Bulk Booking Row
                            return (
                              <tr key={item.id} className="booking-row bulk-row">
                                <td className="futsal-info">
                                  <strong>📦 {item.futsal_name}</strong>
                                  <small>{item.location}</small>
                                  <span className="bulk-badge">{item.total_slots} slots • Rs. {item.total_amount}</span>
                                 </td>
                                <td>
                                  {item.bookings.map((booking, i) => (
                                    <div key={i} className="bulk-slot">
                                      {formatDate(booking.slot_date)} {formatTime(booking.start_time)}-{formatTime(booking.end_time)}
                                      {booking.status !== 'confirmed' && (
                                        <span className="slot-status-badge">{getStatusText(booking)}</span>
                                      )}
                                    </div>
                                  ))}
                                </td>
                                <td className="price-cell">
                                  {item.bookings.map((booking, i) => (
                                    <div key={i} className="bulk-price">Rs. {booking.price}</div>
                                  ))}
                                </td>
                                <td>
                                  {item.has_cancelled ? (
                                    <span className="status-badge-table status-partial">Partial</span>
                                  ) : (
                                    <span className="status-badge-table status-confirmed">Active</span>
                                  )}
                                </td>
                                <td>
                                  {item.can_cancel_all && !item.has_cancelled ? (
                                    <span className="deadline-text">Before game time</span>
                                  ) : (
                                    <span className="na-text">—</span>
                                  )}
                                </td>
                                <td>
                                  {item.can_cancel_all && !item.has_cancelled && (
                                    <button 
                                      className="action-cancel bulk-cancel-btn"
                                      onClick={() => handleBulkCancel(item)}
                                      disabled={cancellingBulk === item.id}
                                    >
                                      {cancellingBulk === item.id ? "..." : "Cancel All"}
                                    </button>
                                  )}
                                  <button className="action-view">View</button>
                                </td>
                              </tr>
                            );
                          } else {
                            // Render Single Booking Row
                            const booking = item;
                            const canCancel = booking.status === 'confirmed' && !booking.is_past && booking.can_cancel;
                            const statusClass = getStatusClass(booking);
                            const statusText = getStatusText(booking);
                            
                            return (
                              <tr key={booking.id} className="booking-row">
                                <td className="futsal-info">
                                  <strong>{booking.futsal_name}</strong>
                                  <small>{booking.location}</small>
                                </td>
                                <td>{formatDate(booking.slot_date)} {formatTime(booking.start_time)}-{formatTime(booking.end_time)}</td>
                                <td className="price-cell">Rs. {booking.price}</td>
                                <td>
                                  <span className={`status-badge-table ${statusClass}`}>
                                    {statusText}
                                  </span>
                                  {booking.status === 'cancelled' && booking.refund_status === 'completed' && (
                                    <span className="refund-badge">Refunded</span>
                                  )}
                                </td>
                                <td>
                                  {booking.status === 'confirmed' && !booking.is_past && booking.cancel_deadline ? (
                                    <span className="deadline-text">{formatDeadline(booking.cancel_deadline)}</span>
                                  ) : (
                                    <span className="na-text">—</span>
                                  )}
                                </td>
                                <td>
                                  {canCancel && (
                                    <button 
                                      className="action-cancel"
                                      onClick={() => handleCancelBooking(booking)}
                                      disabled={cancelling === booking.id}
                                    >
                                      {cancelling === booking.id ? "..." : "Cancel"}
                                    </button>
                                  )}
                                  <button 
                                    className="action-view"
                                    onClick={() => navigate(`/booking/${booking.id}`)}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Single Booking Cancellation Modal */}
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
              <p className="warning-text">
                ⚠️ You must cancel at least 2 hours before the game time to receive a full refund.
              </p>
              <div className="refund-info">
                Refund of Rs. {selectedBooking.price} will be processed within 5-7 business days.
              </div>
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

      {/* Bulk Booking Cancellation Modal */}
      {showBulkConfirmModal && selectedBulkGroup && (
        <div className="modal-overlay" onClick={() => setShowBulkConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cancel Bulk Booking</h3>
              <button className="modal-close" onClick={() => setShowBulkConfirmModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to cancel ALL {selectedBulkGroup.total_slots} slots?</p>
              <div className="booking-summary">
                <p><strong>{selectedBulkGroup.futsal_name}</strong> - {selectedBulkGroup.location}</p>
                <p><strong>{selectedBulkGroup.total_slots} slots</strong> • Total: Rs. {selectedBulkGroup.total_amount}</p>
                <div className="slots-list">
                  {selectedBulkGroup.bookings.map((booking, idx) => (
                    <div key={idx}>
                      • {formatDate(booking.slot_date)} | {formatTime(booking.start_time)} - {formatTime(booking.end_time)} 
                      <span className="slot-price">Rs. {booking.price}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="refund-info">
                <strong>Total Refund:</strong> Rs. {selectedBulkGroup.total_amount}
                <br />
                <small>Will be processed within 5-7 business days</small>
              </div>
              <p className="warning-text">
                ⚠️ You must cancel at least 2 hours before each game time to receive full refunds.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBulkConfirmModal(false)}>
                No, Keep All
              </button>
              <button className="btn-danger" onClick={confirmBulkCancel} disabled={cancellingBulk === selectedBulkGroup.id}>
                {cancellingBulk === selectedBulkGroup.id ? 'Processing...' : 'Yes, Cancel All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;