import React, { useState } from "react";
import api from "../../api/axios";
import Pagination from "../../components/Pagination";

const AdminUsers = ({ users, futsalId, onUserUpdated, currentPage, itemsPerPage, onPageChange }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [restricting, setRestricting] = useState(false);
  
  // Use local state if props not provided
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localItemsPerPage, setLocalItemsPerPage] = useState(10);

  // Use props if provided, otherwise use local state
  const activePage = currentPage !== undefined ? currentPage : localCurrentPage;
  const activeItemsPerPage = itemsPerPage !== undefined ? itemsPerPage : localItemsPerPage;

  // Calculate paginated data
  const totalItems = users.length;
  const totalPages = Math.ceil(totalItems / activeItemsPerPage);
  const startIndex = (activePage - 1) * activeItemsPerPage;
  const endIndex = startIndex + activeItemsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);

  const handlePageChange = (page, newItemsPerPage = null) => {
    if (newItemsPerPage) {
      if (onPageChange) {
        onPageChange(1, newItemsPerPage);
      } else {
        setLocalItemsPerPage(newItemsPerPage);
        setLocalCurrentPage(1);
      }
    } else {
      if (onPageChange) {
        onPageChange(page);
      } else {
        setLocalCurrentPage(page);
      }
    }
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
    setLoadingUserData(true);
    
    try {
      // Fetch user's recent bookings for this futsal
      const response = await api.get(`/admin/futsals/${futsalId}/users/${user.id}/bookings`);
      setUserBookings(response.data.bookings || []);
      setUserStats(response.data.stats || null);
    } catch (error) {
      console.error('Failed to load user bookings:', error);
      setUserStats({
        total_bookings: 0,
        confirmed: 0,
        cancelled: 0,
        total_spent: 0,
        is_restricted: false
      });
    } finally {
      setLoadingUserData(false);
    }
  };

  const handleRestrictUser = async () => {
    if (!selectedUser) return;
    
    const confirmMessage = `Are you sure you want to restrict ${selectedUser.name} from making future bookings at this futsal?\n\nThis will NOT affect their existing bookings.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    setRestricting(true);
    try {
      await api.post(`/admin/futsals/${futsalId}/users/${selectedUser.id}/restrict`);
      alert(`User ${selectedUser.name} has been restricted from booking at this futsal.`);
      setShowUserModal(false);
      setSelectedUser(null);
      if (onUserUpdated) onUserUpdated();
    } catch (error) {
      console.error('Failed to restrict user:', error);
      alert('Failed to restrict user. Please try again.');
    } finally {
      setRestricting(false);
    }
  };

  const handleUnrestrictUser = async () => {
    if (!selectedUser) return;
    
    if (!window.confirm(`Allow ${selectedUser.name} to book at this futsal again?`)) return;
    
    setRestricting(true);
    try {
      await api.post(`/admin/futsals/${futsalId}/users/${selectedUser.id}/unrestrict`);
      alert(`User ${selectedUser.name} can now book at this futsal again.`);
      setShowUserModal(false);
      setSelectedUser(null);
      if (onUserUpdated) onUserUpdated();
    } finally {
      setRestricting(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Users</h2>
      <p className="page-sub" style={{ marginBottom: 16 }}>
        Users who have booked at your futsal. Click "View Details" to manage user restrictions.
      </p>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name || "N/A"}</strong></td>
                  <td>{u.email || "N/A"}</td>
                  <td>{u.phone || "N/A"}</td>
                  <td>
                    <button 
                      className="btn-view-user"
                      onClick={() => handleViewUser(u)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr><td colSpan="4" className="empty-row">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={activePage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={activeItemsPerPage}
          onPageChange={handlePageChange}
        />
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details: {selectedUser.name}</h3>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* User Information */}
              <div className="user-info-section">
                <h4>User Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{selectedUser.name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{selectedUser.email || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone:</span>
                    <span className="info-value">{selectedUser.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* User Statistics */}
              {userStats && (
                <div className="user-stats-section">
                  <h4>Booking Statistics of {selectedUser.name}</h4>
                  <div className="stats-grid-mini">
                    <div className="stat-mini">
                      <div className="stat-mini-value">{userStats.total_bookings || 0}</div>
                      <div className="stat-mini-label">Total Bookings</div>
                    </div> 
                    <div className="stat-mini">
                      <div className="stat-mini-value" style={{ color: '#27ae60' }}>{userStats.confirmed || 0}</div>
                      <div className="stat-mini-label">Confirmed</div>
                    </div>
                    <div className="stat-mini">
                      <div className="stat-mini-value" style={{ color: '#e74c3c' }}>{userStats.cancelled || 0}</div>
                      <div className="stat-mini-label">Cancelled</div>
                    </div>
                    <div className="stat-mini">
                      <div className="stat-mini-value">Rs. {(userStats.total_spent || 0).toLocaleString()}</div>
                      <div className="stat-mini-label">Total Spent</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Status */}
              <div className="user-status-section">
                <h4>Account Status</h4>
                <div className="status-badge-container">
                  {userStats?.is_restricted ? (
                    <span className="status-badge status-restricted">Restricted from Booking</span>
                  ) : (
                    <span className="status-badge status-active">Active - Can Book</span>
                  )}
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="user-bookings-section">
                <h4>Recent Bookings (Last 5 at this Futsal)</h4>
                {loadingUserData ? (
                  <div className="loading-text">Loading user bookings...</div>
                ) : userBookings.length > 0 ? (
                  <div className="table-responsive">
                    <table className="data-table-mini">
                      <thead>
                        <tr>
                          <th>Slot Date</th>
                          <th>Slot Time</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th>Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userBookings.map(booking => (
                          <tr key={booking.id}>
                            <td>{booking.slot_date || 'N/A'}</td>
                            <td>{booking.slot_time || 'N/A'}</td>
                            <td>Rs. {parseFloat(booking.price || 0).toLocaleString()}</td>
                            <td>
                              {booking.status === 'confirmed' && <span className="status-badge status-confirmed">Confirmed</span>}
                              {booking.status === 'cancelled' && <span className="status-badge status-cancelled">Cancelled</span>}
                              {booking.status === 'pending' && <span className="status-badge status-pending">Pending</span>}
                            </td>
                            <td>
                              {booking.payment_status === 'paid' && <span className="payment-badge paid">✓ Paid</span>}
                              {booking.payment_status === 'unpaid' && <span className="payment-badge unpaid">Unpaid</span>}
                              {booking.refund_status === 'completed' && <span className="payment-badge refunded">Refunded</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-message">No bookings found for this user at this futsal.</div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {userStats?.is_restricted ? (
                <button 
                  className="btn-success" 
                  onClick={handleUnrestrictUser}
                  disabled={restricting}
                >
                  {restricting ? "Processing..." : "Allow Booking"}
                </button>
              ) : (
                <button 
                  className="btn-danger" 
                  onClick={handleRestrictUser}
                  disabled={restricting}
                >
                  {restricting ? "Processing..." : "Restrict from Booking"}
                </button>
              )}
              <button className="btn-secondary" onClick={() => setShowUserModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;