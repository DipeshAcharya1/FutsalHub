import React, { useState, useEffect } from "react";
import Pagination from "../../components/Pagination";

const AdminPayments = ({ payments, totalRevenue, currentPage, itemsPerPage, onPageChange }) => {
  // Use local state if props not provided
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localItemsPerPage, setLocalItemsPerPage] = useState(10);

  // Use props if provided, otherwise use local state
  const activePage = currentPage !== undefined ? currentPage : localCurrentPage;
  const activeItemsPerPage = itemsPerPage !== undefined ? itemsPerPage : localItemsPerPage;

  // Calculate refund statistics
  const refundedPayments = payments.filter(p => p.refund_status === 'completed');
  const totalRefunded = refundedPayments.reduce((sum, p) => sum + parseFloat(p.refund_amount || 0), 0);
  const netRevenue = totalRevenue - totalRefunded;
  const pendingRefunds = payments.filter(p => p.refund_status === 'pending').length;
  const failedRefunds = payments.filter(p => p.refund_status === 'failed').length;

  // Calculate paginated data
  const totalItems = payments.length;
  const totalPages = Math.ceil(totalItems / activeItemsPerPage);
  const startIndex = (activePage - 1) * activeItemsPerPage;
  const endIndex = startIndex + activeItemsPerPage;
  const paginatedPayments = payments.slice(startIndex, endIndex);

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

  return (
    <div>
      <h2 className="page-title">Payments</h2>
      <p className="page-sub" style={{ marginBottom: 16 }}>
        All payment transactions including refunds.
      </p>

      {/* Statistics Cards */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-box">
          <div className="stat-label">Gross Revenue</div>
          <div className="stat-num">Rs. {totalRevenue.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Refunded Amount</div>
          <div className="stat-num" style={{ color: '#e74c3c' }}>- Rs. {totalRefunded.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Net Revenue</div>
          <div className="stat-num" style={{ color: '#27ae60' }}>Rs. {netRevenue.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Transactions</div>
          <div className="stat-num">{payments.length}</div>
        </div>
      </div>

      {/* Alert Messages */}
      {pendingRefunds > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          ⏳ {pendingRefunds} payment(s) have pending refunds. Please check Khalti dashboard.
        </div>
      )}

      {failedRefunds > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          ⚠️ {failedRefunds} payment(s) have failed refunds. Manual intervention needed.
        </div>
      )}

      {/* Payments Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Booking Date</th>
                <th>Slot Time</th>
                <th>Method</th>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Booking Status</th>
                <th>Refund Status</th>
                <th>Refund Amount</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.map(p => {
                const isRefunded = p.refund_status === 'completed';
                const isRefundPending = p.refund_status === 'pending';
                const isRefundFailed = p.refund_status === 'failed';
                
                return (
                  <tr key={p.id} className={isRefunded ? 'refunded-payment' : (isRefundPending ? 'refund-pending-row' : '')}>
                    <td><strong>{p.user_name || "N/A"}</strong></td>
                    <td>{p.booking_date || "N/A"}</td>
                    <td>{p.slot_time || "N/A"}</td>
                    <td>{p.payment_method || "Online"}</td>
                    <td className="small-text">{p.transaction_id || "N/A"}</td>
                    <td>
                      <strong>Rs. {parseFloat(p.amount || 0).toLocaleString()}</strong>
                    </td>
                    <td>
                      {p.booking_status === 'cancelled' ? (
                        <span className="status-badge status-cancelled">Cancelled</span>
                      ) : (
                        <span className="status-badge status-confirmed">Confirmed</span>
                      )}
                    </td>
                    <td>
                      {isRefundPending && (
                        <div>
                          <span className="refund-badge refund-pending">⏳ Processing</span>
                          <div className="refund-help">Awaiting Khalti</div>
                        </div>
                      )}
                      {isRefunded && (
                        <div>
                          <span className="refund-badge refund-completed">✓ Refunded</span>
                          <div className="refund-date-small">
                            {p.refunded_at && new Date(p.refunded_at).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      {isRefundFailed && (
                        <div>
                          <span className="refund-badge refund-failed">⚠️ Failed</span>
                          <div className="refund-help">Manual intervention</div>
                        </div>
                      )}
                      {(!p.refund_status || p.refund_status === 'none') && (
                        <span className="refund-badge refund-none">No Refund</span>
                      )}
                    </td>
                    <td>
                      {p.refund_amount > 0 && (
                        <span style={{ color: isRefunded ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                          {isRefunded ? '+' : '-'} Rs. {parseFloat(p.refund_amount).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="small-text">{p.payment_date || "N/A"}</td>
                  </tr>
                );
              })}
              {paginatedPayments.length === 0 && (
                <tr>
                  <td colSpan="10" className="empty-row">No payment records found.</td>
                </tr>
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

      {/* Refund Summary Section */}
      {refundedPayments.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-head">
            <h3>Refund Summary</h3>
          </div>
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-label">Total Refunded Bookings</div>
              <div className="stat-num">{refundedPayments.length}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Refund Amount</div>
              <div className="stat-num" style={{ color: '#27ae60' }}>Rs. {totalRefunded.toLocaleString()}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Refund Success Rate</div>
              <div className="stat-num">
                {payments.filter(p => p.refund_status === 'completed' || p.refund_status === 'failed').length > 0
                  ? Math.round((refundedPayments.length / payments.filter(p => p.refund_status === 'completed' || p.refund_status === 'failed').length) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;