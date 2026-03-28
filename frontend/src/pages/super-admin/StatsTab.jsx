import React from "react";

const StatsTab = ({ stats, selectedFutsalId, futsals }) => {
  if (!stats) return <div className="loading-text">Loading stats...</div>;

  const selectedFutsal = selectedFutsalId 
    ? futsals?.find(f => f.id === parseInt(selectedFutsalId))
    : null;

  return (
    <section className="tab-content">
      {selectedFutsal && (
        <div className="filter-info">
          <div className="info-badge">
            Showing data for: <strong>{selectedFutsal.futsal_name}</strong>
            <span className="location">({selectedFutsal.location})</span>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card large">
          <span className="stat-value">{stats.total_futsals || 0}</span>
          <span className="stat-label">Total Futsals</span>
        </div>
        <div className="stat-card large">
          <span className="stat-value">{stats.total_users || 0}</span>
          <span className="stat-label">Total Users</span>
        </div>
        <div className="stat-card large">
          <span className="stat-value">{stats.total_admins || 0}</span>
          <span className="stat-label">Total Admins</span>
        </div>
        <div className="stat-card large">
          <span className="stat-value">{stats.total_bookings || 0}</span>
          <span className="stat-label">Total Bookings</span>
        </div>
        <div className="stat-card large">
          <span className="stat-value">Rs. {Number(stats.total_revenue || 0).toLocaleString()}</span>
          <span className="stat-label">Total Revenue</span>
        </div>
      </div>

      <div className="stats-details">
        <div className="card">
          <h3>Booking Status</h3>
          <div className="status-stats">
            <div className="status-item">
              <span className="status-label">Confirmed</span>
              <span className="status-value confirmed">{stats.confirmed_bookings || 0}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Pending</span>
              <span className="status-value pending">{stats.pending_bookings || 0}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Cancelled</span>
              <span className="status-value cancelled">{stats.cancelled_bookings || 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Recent Bookings</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Futsal</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Payment</th>
                </tr>  
                </thead>
              <tbody>
                {stats.recent_bookings?.map((b, i) => (
                  <tr key={i}>
                    <td>{b.user_name}</td>
                    <td>{b.futsal_name}</td>
                    <td>{b.slot_date}</td>
                    <td>
                      <span className={`status-badge ${b.status}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-badge ${b.payment_status}`}>
                        {b.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!stats.recent_bookings || stats.recent_bookings.length === 0) && (
                  <tr>
                    <td colSpan="5" className="empty-message">No recent bookings</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsTab;