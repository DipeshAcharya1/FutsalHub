import React from "react";
import Pagination from "../../components/Pagination";

const BookingsTab = ({ 
  bookings, 
  loading, 
  futsals, 
  selectedFutsalId, 
  onFilterChange,
  currentPage,
  itemsPerPage,
  onPageChange
}) => {
  // Calculate paginated data
  const totalItems = bookings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = bookings.slice(startIndex, endIndex);

  const getRefundStatusBadge = (refundStatus, status) => {
    if (status !== 'cancelled') return null;
    
    switch (refundStatus) {
      case 'pending':
        return <span className="refund-badge refund-pending">⏳ Refund Pending</span>;
      case 'completed':
        return <span className="refund-badge refund-completed">✓ Refunded</span>;
      case 'failed':
        return <span className="refund-badge refund-failed">⚠️ Refund Failed</span>;
      default:
        return <span className="refund-badge refund-none">No Refund</span>;
    }
  };

  const handleFilterChange = (value) => {
    onFilterChange(value);
    onPageChange(1);
  };

  return (
    <section className="tab-content">
      <div className="content-header">
        <h3>All Bookings</h3>
        {futsals && futsals.length > 0 && (
          <div className="filter-select">
            <select 
              value={selectedFutsalId || ""} 
              onChange={(e) => handleFilterChange(e.target.value || null)}
              className="filter-select"
            >
              <option value="">All Futsals</option>
              {futsals.map(f => (
                <option key={f.id} value={f.id}>
                  {f.futsal_name} ({f.location})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && <div className="loading-text">Loading bookings...</div>}

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Futsal</th>
              <th>Date</th>
              <th>Time</th>
              <th>Price</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Refund Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBookings.map((b) => (
              <tr key={b.id} className={b.status === 'cancelled' ? 'cancelled-booking' : ''}>
                <td>
                  <div><strong>{b.user_name}</strong></div>
                  <small style={{ color: '#666' }}>{b.user_email}</small>
                </td>
                <td><strong>{b.futsal_name}</strong></td>
                <td>{b.slot_date}</td>
                <td>{b.time_slot}</td>
                <td>Rs. {b.price}</td>
                <td>
                  <span className={`status-badge ${b.status}`}>
                    {b.status}
                  </span>
                </td>
                <td>
                  <span className={`payment-badge ${b.payment_status}`}>
                    {b.payment_status === 'paid' ? '✓ Paid' : b.payment_status}
                  </span>
                </td>
                <td>
                  {getRefundStatusBadge(b.refund_status, b.status)}
                  {b.refund_amount > 0 && b.refund_status === 'completed' && (
                    <div className="refund-amount-small">Rs. {b.refund_amount}</div>
                  )}
                </td>
              </tr>
            ))}
            {paginatedBookings.length === 0 && !loading && (
              <tr>
                <td colSpan="8" className="empty-message">No bookings found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
      />
    </section>
  );
};

export default BookingsTab;