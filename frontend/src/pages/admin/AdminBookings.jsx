import React, { useEffect, useState } from "react";
import Pagination from "../../components/Pagination";

const AdminBookings = ({ 
  bookings, filteredBookings, bookingFilter, setBookingFilter,
  currentPage,
  itemsPerPage,
  onPageChange
}) => {
  const filters = ["all", "confirmed", "cancelled"];

  // Pagination state (local if not provided as props)
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localItemsPerPage, setLocalItemsPerPage] = useState(10);

  // Use props if provided, otherwise use local state
  const activePage = currentPage !== undefined ? currentPage : localCurrentPage;
  const activeItemsPerPage = itemsPerPage !== undefined ? itemsPerPage : localItemsPerPage;

  // Calculate paginated data
  const totalItems = filteredBookings.length;
  const totalPages = Math.ceil(totalItems / activeItemsPerPage);
  const startIndex = (activePage - 1) * activeItemsPerPage;
  const endIndex = startIndex + activeItemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

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

  // Debug: Log all bookings with refund data
  useEffect(() => {
    const cancelledWithRefunds = bookings.filter(b => 
      b.status === 'cancelled' && b.refund_status === 'completed'
    );
    console.log('All cancelled bookings with refunds:', cancelledWithRefunds);
  }, [bookings]);

  // Reset to first page when filter changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(1);
    } else {
      setLocalCurrentPage(1);
    }
  }, [bookingFilter]);

  const isBookingExpired = (booking) => {
    if (!booking.slot_time) return false;
    const slotDateTime = new Date(booking.slot_date + ' ' + booking.slot_time.split(' - ')[1]);
    return new Date() > slotDateTime;
  };

  const getRefundStatusBadge = (booking) => {
    // Only show refund status for cancelled bookings
    if (booking.status !== 'cancelled') return null;
    
    // Debug specific booking
    if (booking.id === 53) {
      console.log('Booking 53 refund data:', {
        refund_status: booking.refund_status,
        refund_amount: booking.refund_amount,
        refunded_at: booking.refunded_at
      });
    }
    
    switch (booking.refund_status) {
      case 'pending':
        return (
          <div>
            <span className="refund-badge refund-pending">⏳ Refund Processing</span>
            <div className="refund-amount-pending">Awaiting Khalti response</div>
          </div>
        );
      case 'completed':
        return (
          <div>
            <span className="refund-badge refund-completed">✓ Refunded</span>
            <div className="refund-amount">Rs. {booking.refund_amount || '0'}</div>
            {booking.refunded_at && (
              <div className="refund-date">on {new Date(booking.refunded_at).toLocaleDateString()}</div>
            )}
          </div>
        );
      case 'failed':
        return (
          <div>
            <span className="refund-badge refund-failed">⚠️ Refund Failed</span>
            <div className="refund-failed-warning">Manual intervention needed</div>
          </div>
        );
      default:
        return (
          <div>
            <span className="refund-badge refund-none">No Refund</span>
            <div className="refund-none-text">Cancelled without refund</div>
          </div>
        );
    }
  };

  const getStatusBadge = (booking) => {
    if (booking.status === 'cancelled') {
      if (booking.refund_status === 'pending') {
        return <span className="status-badge status-cancelled-refund-pending">
          Cancelled (Refunding: Rs.{booking.refund_amount || '0'})
        </span>;
      } else if (booking.refund_status === 'completed') {
        return <span className="status-badge status-cancelled-refunded">
          Cancelled (Refunded: Rs.{booking.refund_amount || '0'})
        </span>;
      } else if (booking.refund_status === 'failed') {
        return <span className="status-badge status-cancelled-refund-failed">
          Cancelled (Refund Failed)
        </span>;
      }
      return <span className="status-badge status-cancelled">Cancelled (No Refund)</span>;
    }
    return <span className="status-badge status-confirmed">Confirmed</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Bookings</h2>
          <p className="page-sub">View all customer bookings including cancelled ones.</p>
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
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Slot Time</th>
                <th>Booking Date</th>
                <th>Status</th>
                <th>Payment Status</th>
                <th>Refund Status</th>
                <th>Cancellation Info</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.map(booking => {
                const isExpired = isBookingExpired(booking);
                const isCancelled = booking.status === 'cancelled';
                
                return (
                  <tr key={booking.id} className={isCancelled ? 'cancelled-booking' : (isExpired ? 'expired-booking' : '')}>
                    <td>
                      #{booking.id}
                      {isCancelled && (
                        <div className="cancelled-badge">✗</div>
                      )}
                    </td>
                    <td>
                      <div><strong>{booking.user_name || "N/A"}</strong></div>
                      <div className="small-text">{booking.user_email || ""}</div>
                      <div className="small-text">{booking.user_phone || ""}</div>
                    </td>
                    <td><strong>{booking.slot_time || "N/A"}</strong></td>
                    <td>{booking.booking_date || "N/A"}</td>
                    <td>{getStatusBadge(booking)}</td>
                    <td>
                      <span className={"status-badge status-" + (booking.payment_status || "unknown")}>
                        {booking.payment_status === 'paid' ? '✓ Paid' : (booking.payment_status || 'N/A')}
                      </span>
                    </td>
                    <td>{getRefundStatusBadge(booking)}</td>
                    <td>
                      {isCancelled && booking.refunded_at && (
                        <div className="cancellation-info">
                          <div>Cancelled on: {new Date(booking.refunded_at).toLocaleDateString()}</div>
                          {booking.refund_status === 'completed' && (
                            <div className="refund-complete">✓ Refund processed</div>
                          )}
                          {booking.refund_status === 'pending' && (
                            <div className="refund-pending">⏳ Refund in progress</div>
                          )}
                          {booking.refund_status === 'failed' && (
                            <div className="refund-failed-warning">⚠️ Manual intervention needed</div>
                          )}
                        </div>
                      )}
                      {!isCancelled && isExpired && (
                        <span className="small-text" style={{ color: '#856404' }}>✓ Completed</span>
                      )}
                      {!isCancelled && !isExpired && booking.status === "confirmed" && (
                        <span className="small-text" style={{ color: '#28a745' }}>Upcoming</span>
                      )}
                    </td>
                    <td>
                      {isCancelled && booking.refund_status === 'failed' && (
                        <button 
                          className="btn-small btn-warning"
                          onClick={() => window.location.href = `/admin/refund/${booking.id}`}
                        >
                          Retry Refund
                        </button>
                      )}
                      {isCancelled && booking.refund_status === 'completed' && (
                        <span className="refund-complete-badge">✓ Refund Complete</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {paginatedBookings.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-row">No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Component */}
        <Pagination
          currentPage={activePage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={activeItemsPerPage}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default AdminBookings;