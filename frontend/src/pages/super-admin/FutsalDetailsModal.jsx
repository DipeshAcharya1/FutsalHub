import React from "react";

const FutsalDetailsModal = ({ futsal, onClose }) => {
  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2>{futsal.futsal?.name || 'Futsal Details'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Futsal Info */}
          <div className="futsal-info-section">
            {futsal.futsal?.image && (
              <img 
                src={futsal.futsal.image} 
                alt={futsal.futsal.name} 
                className="futsal-detail-image"
              />
            )}
            <div className="info-grid">
              <div className="info-item">
                <label>Location:</label>
                <span>{futsal.futsal?.location || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Contact:</label>
                <span>{futsal.futsal?.contact || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Manager:</label>
                <span>{futsal.futsal?.manager?.name || 'No manager assigned'}</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className={`status-badge ${futsal.futsal?.active ? 'active' : 'inactive'}`}>
                  {futsal.futsal?.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="description">
              <label>Description:</label>
              <p>{futsal.futsal?.description || 'No description available'}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-section">
            <h3>Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{futsal.stats?.total_slots || 0}</span>
                <span className="stat-label">Total Slots</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{futsal.stats?.available_slots || 0}</span>
                <span className="stat-label">Available Slots</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{futsal.stats?.booked_slots || 0}</span>
                <span className="stat-label">Booked Slots</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">Rs. {(futsal.stats?.total_revenue || 0).toLocaleString()}</span>
                <span className="stat-label">Total Revenue</span>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="recent-bookings-section">
            <h3>Recent Bookings</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>  
                  </thead>
                <tbody>
                  {futsal.recent_bookings?.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <div><strong>{booking.user_name}</strong></div>
                        <small style={{ color: '#666' }}>{booking.user_email}</small>
                      </td>
                      <td>{booking.slot_date}</td>
                      <td>{booking.time_slot}</td>
                      <td>Rs. {booking.price}</td>
                      <td>
                        <span className={`status-badge ${booking.status}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!futsal.recent_bookings || futsal.recent_bookings.length === 0) && (
                    <tr>
                      <td colSpan="5" className="empty-message">No recent bookings</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Slots */}
          <div className="upcoming-slots-section">
            <h3>Upcoming Slots</h3>
            {futsal.slots_by_date?.map((dateGroup) => (
              <div key={dateGroup.date} className="date-group">
                <h4>{dateGroup.formatted_date} ({dateGroup.day})</h4>
                <div className="slots-grid">
                  {dateGroup.slots.map((slot) => (
                    <div key={slot.id} className={`slot-card ${!slot.is_available ? 'unavailable' : ''}`}>
                      <div className="slot-time">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </div>
                      <div className="slot-price">Rs. {slot.price}</div>
                      <div className="slot-status">
                        {slot.is_available ? 'Available' : 'Booked'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(!futsal.slots_by_date || futsal.slots_by_date.length === 0) && (
              <p className="empty-message">No upcoming slots</p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default FutsalDetailsModal;