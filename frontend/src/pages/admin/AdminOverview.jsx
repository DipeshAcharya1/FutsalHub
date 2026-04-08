import React from "react";

const AdminOverview = ({ 
  futsalInfo, futsalLoading, futsalActive, canModify,
  bookings, confirmedCount, todayBookings, availableSlots,
  onEditFutsal, setTab 
}) => {
  // Remove pendingCount - only confirmed bookings
  const totalBookings = bookings.length;

  return (
    <div>
      <h2 className="page-title">Overview</h2>
      <p className="page-sub">
        Managing: <strong>{futsalInfo?.futsal_name || (futsalLoading ? "Loading..." : "Not found")}</strong>
        {!futsalActive && <span style={{ marginLeft: '10px', color: '#856404' }}>(Read Only)</span>}
      </p>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-label">Total Bookings</div>
          <div className="stat-num">{totalBookings}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Confirmed</div>
          <div className="stat-num">{confirmedCount}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Today Bookings</div>
          <div className="stat-num">{todayBookings}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Available Slots</div>
          <div className="stat-num">{availableSlots}</div>
        </div>
      </div>

      {futsalInfo ? (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-head">
            <h3>Futsal Details</h3>
            {canModify && (
              <button className="btn btn-secondary" onClick={onEditFutsal}>
                Edit Futsal
              </button>
            )}
          </div>
          
          {futsalInfo.image && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <img 
                src={futsalInfo.image} 
                alt={futsalInfo.futsal_name}
                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }}
              />
            </div>
          )}
          
          <div className="detail-list">
            <div className="detail-item">
              <div className="detail-label">Name</div>
              <div className="detail-value">{futsalInfo.futsal_name || "N/A"}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Location</div>
              <div className="detail-value">{futsalInfo.location || "N/A"}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Contact</div>
              <div className="detail-value">{futsalInfo.contact_number || "N/A"}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Latitude</div>
              <div className="detail-value">{futsalInfo.latitude !== null ? futsalInfo.latitude : "N/A"}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Longitude</div>
              <div className="detail-value">{futsalInfo.longitude !== null ? futsalInfo.longitude : "N/A"}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Description</div>
              <div className="detail-value">{futsalInfo.description || "N/A"}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 24, padding: '20px', textAlign: 'center' }}>
          {futsalLoading ? "Loading futsal information..." : "No futsal information available"}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h3>Recent Bookings</h3>
          <button className="link-btn" onClick={() => setTab("bookings")}>View All</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Booking Date</th>
              <th>Slot Time</th>
              <th>Status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {bookings.slice(0, 5).map(b => (
              <tr key={b.id}>
                <td>{b.user_name || "N/A"}</td>
                <td>{b.booking_date || "N/A"}</td>
                <td>{b.slot_time || "N/A"}</td>
                <td>
                  <span className={"status-badge status-" + (b.status || "unknown")}>
                    {b.status || "N/A"}
                  </span>
                </td>
                <td>
                  <span className={"status-badge status-" + (b.payment_status || "unknown")}>
                    {b.payment_status || "N/A"}
                  </span>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={5} className="empty-row">No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOverview;