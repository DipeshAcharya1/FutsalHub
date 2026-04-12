import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Pagination from '../../components/Pagination';

const SuperAdminPayments = ({ futsals = [], selectedFutsalId, onFilterChange }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [stats, setStats] = useState({
    total_revenue: 0,
    total_refunded: 0,
    net_revenue: 0,
    total_transactions: 0,
    pending_refunds: 0,
    completed_refunds: 0,
    failed_refunds: 0
  });
  const [localFutsalId, setLocalFutsalId] = useState(selectedFutsalId || '');

  useEffect(() => {
    fetchPayments();
  }, [currentPage, itemsPerPage, localFutsalId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let url = `/super-admin/payments?page=${currentPage}&per_page=${itemsPerPage}`;
      if (localFutsalId) {
        url += `&futsal_id=${localFutsalId}`;
      }
      
      const response = await api.get(url);
      if (response.data) {
        setPayments(response.data || []);
        
        // Calculate statistics from all payments (not just current page)
        const allPaymentsUrl = `/super-admin/payments?per_page=1000${localFutsalId ? `&futsal_id=${localFutsalId}` : ''}`;
        const allPaymentsResponse = await api.get(allPaymentsUrl);
        const allPayments = allPaymentsResponse.data || [];
        
        calculateStats(allPayments);
        
        // For pagination, we need to know total count
        // Assuming the API returns paginated data
        if (response.data.meta) {
          setTotalPages(response.data.meta.last_page);
          setTotalItems(response.data.meta.total);
        } else {
          // If API doesn't return pagination, calculate manually
          setTotalPages(Math.ceil(allPayments.length / itemsPerPage));
          setTotalItems(allPayments.length);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData) => {
    const totalRevenue = paymentsData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalRefunded = paymentsData.reduce((sum, p) => sum + (parseFloat(p.refund_amount) || 0), 0);
    const netRevenue = totalRevenue - totalRefunded;
    const totalTransactions = paymentsData.length;
    const pendingRefunds = paymentsData.filter(p => p.refund_status === 'pending').length;
    const completedRefunds = paymentsData.filter(p => p.refund_status === 'completed').length;
    const failedRefunds = paymentsData.filter(p => p.refund_status === 'failed').length;

    setStats({
      total_revenue: totalRevenue,
      total_refunded: totalRefunded,
      net_revenue: netRevenue,
      total_transactions: totalTransactions,
      pending_refunds: pendingRefunds,
      completed_refunds: completedRefunds,
      failed_refunds: failedRefunds
    });
  };

  const handlePageChange = (page, newItemsPerPage = null) => {
    if (newItemsPerPage) {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);
    } else {
      setCurrentPage(page);
    }
  };

  const handleFutsalFilter = (futsalId) => {
    setLocalFutsalId(futsalId);
    setCurrentPage(1);
    if (onFilterChange) {
      onFilterChange(futsalId);
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

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRefundStatusBadge = (refundStatus) => {
    switch (refundStatus) {
      case 'pending':
        return <span className="refund-badge refund-pending">⏳ Pending</span>;
      case 'completed':
        return <span className="refund-badge refund-completed">✓ Completed</span>;
      case 'failed':
        return <span className="refund-badge refund-failed">⚠️ Failed</span>;
      default:
        return <span className="refund-badge refund-none">No Refund</span>;
    }
  };

  const getBookingStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="status-badge status-confirmed">Confirmed</span>;
      case 'cancelled':
        return <span className="status-badge status-cancelled">Cancelled</span>;
      case 'pending':
        return <span className="status-badge status-pending">Pending</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  // Get current page payments
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = payments.slice(startIndex, endIndex);

  return (
    <div className="superadmin-payments">
      <div className="payments-header">
        <h2>Payment Transactions</h2>
        <p>View all payment transactions across all futsals including refund details</p>
      </div>

      {/* Statistics Cards */}
      <div className="payment-stats-grid">
        <div className="payment-stat-card">
          <div className="stat-info">
            <div className="stat-value">Rs. {stats.total_revenue.toLocaleString()}</div>
            <div className="stat-label">Gross Revenue</div>
          </div>
        </div>
        <div className="payment-stat-card">
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#e74c3c' }}>- Rs. {stats.total_refunded.toLocaleString()}</div>
            <div className="stat-label">Total Refunded</div>
          </div>
        </div>
        <div className="payment-stat-card">
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#27ae60' }}>Rs. {stats.net_revenue.toLocaleString()}</div>
            <div className="stat-label">Net Revenue</div>
          </div>
        </div>
        <div className="payment-stat-card">
          <div className="stat-info">
            <div className="stat-value">{stats.total_transactions}</div>
            <div className="stat-label">Transactions</div>
          </div>
        </div>
      </div>

      {/* Refund Summary Cards */}
      <div className="refund-summary">
        <div className="refund-summary-header">
          <h3>Refund Summary</h3>
        </div>
        <div className="refund-stats-grid">
          <div className="refund-stat-card pending">
            <div className="refund-stat-value">{stats.pending_refunds}</div>
            <div className="refund-stat-label">Pending Refunds</div>
          </div>
          <div className="refund-stat-card completed">
            <div className="refund-stat-value">{stats.completed_refunds}</div>
            <div className="refund-stat-label">Completed Refunds</div>
          </div>
          <div className="refund-stat-card failed">
            <div className="refund-stat-value">{stats.failed_refunds}</div>
            <div className="refund-stat-label">Failed Refunds</div>
          </div>
          <div className="refund-stat-card success-rate">
            <div className="refund-stat-value">
              {stats.completed_refunds + stats.failed_refunds > 0 
                ? Math.round((stats.completed_refunds / (stats.completed_refunds + stats.failed_refunds)) * 100)
                : 0}%
            </div>
            <div className="refund-stat-label">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="payment-filter-bar">
        {futsals.length > 0 && (
          <div className="futsal-filter">
            <label>Filter by Futsal:</label>
            <select 
              value={localFutsalId} 
              onChange={(e) => handleFutsalFilter(e.target.value || null)}
              className="futsal-select"
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
        <div className="payment-count">
          Showing {currentPayments.length} of {totalItems} transactions
        </div>
      </div>

      {/* Payments Table */}
      <div className="payments-table-container">
        {loading ? (
          <div className="loading-payments">
            <div className="loading-spinner"></div>
            <p>Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="no-payments">
            <p>No payment records found</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Futsal</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Transaction ID</th>
                  <th>Payment Date</th>
                  <th>Booking Status</th>
                  <th>Refund Status</th>
                  <th>Refund Amount</th>
                  <th>Refund Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className={payment.refund_status === 'completed' ? 'refunded-row' : ''}>
                    <td>
                      <strong>{payment.futsal_name}</strong>
                    </td>
                    <td>
                      <div className="customer-info">
                        <div className="customer-name">{payment.user_name}</div>
                        <div className="customer-email">{payment.user_email}</div>
                      </div>
                    </td>
                    <td className="amount-cell">
                      <strong>Rs. {parseFloat(payment.amount).toLocaleString()}</strong>
                    </td>
                    <td>
                      <span className="payment-method">{payment.payment_method || 'Online'}</span>
                    </td>
                    <td className="transaction-id">
                      <code>{payment.transaction_id || 'N/A'}</code>
                    </td>
                    <td>{formatDateTime(payment.payment_date)}</td>
                    <td>{getBookingStatusBadge(payment.booking_status)}</td>
                    <td>{getRefundStatusBadge(payment.refund_status)}</td>
                    <td className="refund-amount-cell">
                      {payment.refund_amount > 0 && (
                        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                          Rs. {parseFloat(payment.refund_amount).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td>{payment.refunded_at ? formatDateTime(payment.refunded_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default SuperAdminPayments;