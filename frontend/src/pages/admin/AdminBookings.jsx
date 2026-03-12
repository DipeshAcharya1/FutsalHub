import React from "react";

const AdminBookings = ({ 
  bookings, filteredBookings, bookingFilter, setBookingFilter, updateBookingStatus 
}) => {
  const filters = ["all", "pending", "confirmed", "cancelled"];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Bookings</h2>
          <p className="page-sub">View and manage all customer bookings.</p>
        </div>
      </div>

      <div className="filter-row">
        {filters.map(f => (
          <button
            key={f}
            className={bookingFilter === f ? "filter-btn filter-btn-active" : "filter-btn"}
            onClick={() => setBookingFilter(f)}
          >
            {f === "all"
              ? "All (" + bookings.length + ")"
              : f.charAt(0).toUpperCase() + f.slice(1) +
                " (" + bookings.filter(b => b.status === f).length + ")"}
          </button>
        ))}
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Slot Time</th>
              <th>Booking Date</th>
              <th>Status</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map(b => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>
                  <div>{b.user_name || "N/A"}</div>
                  <div className="small-text">{b.user_email || ""}</div>
                  <div className="small-text">{b.user_phone || ""}</div>
                </td>
                <td>{b.slot_time || "N/A"}</td>
                <td>{b.booking_date || "N/A"}</td>
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
                <td>
                  {b.status === "pending" && (
                    <div>
                      <button className="action-btn action-btn-confirm" onClick={() => updateBookingStatus(b.id, "confirmed")}>
                        Confirm
                      </button>
                      <button className="action-btn action-btn-danger" onClick={() => updateBookingStatus(b.id, "cancelled")}>
                        Cancel
                      </button>
                    </div>
                  )}
                  {b.status === "confirmed" && (
                    <button className="action-btn action-btn-danger" onClick={() => updateBookingStatus(b.id, "cancelled")}>
                      Cancel
                    </button>
                  )}
                  {b.status === "cancelled" && (
                    <span className="small-text">No actions</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredBookings.length === 0 && (
              <tr><td colSpan={7} className="empty-row">No bookings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBookings;