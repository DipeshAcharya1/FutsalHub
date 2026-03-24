import React from "react";

const AdminBookings = ({ 
  bookings, filteredBookings, bookingFilter, setBookingFilter 
}) => {
  // Only show confirmed and cancelled (no pending)
  const filters = ["all", "confirmed", "cancelled"];

  const isBookingExpired = (booking) => {
    const slotDateTime = new Date(booking.slot_date + ' ' + booking.slot_time.split(' - ')[1]);
    return new Date() > slotDateTime;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Bookings</h2>
          <p className="page-sub">View all customer bookings. Bookings are automatically confirmed.</p>
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
              <th>Notes</th>
            </tr>
            </thead>
          <tbody>
            {filteredBookings.map(b => {
              const isExpired = isBookingExpired(b);
              return (
                <tr key={b.id} className={isExpired ? 'expired-booking' : ''}>
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
                    {isExpired && b.status === "confirmed" && (
                      <span className="small-text" style={{ color: '#856404' }}>Completed</span>
                    )}
                    {!isExpired && b.status === "confirmed" && (
                      <span className="small-text" style={{ color: '#28a745' }}>Upcoming</span>
                    )}
                    {b.status === "cancelled" && (
                      <span className="small-text">Cancelled</span>
                    )}
                  </td>
                </tr>
              );
            })}
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