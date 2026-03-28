import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const response = await api.get('/payment/history');
      if (response.data.success) {
        setPayments(response.data.data);
      }
    } catch (err) {
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <div className="loading-container">Loading payment history...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="payment-history-container">
      <h2>Payment History</h2>
      
      {payments.length === 0 ? (
        <p className="empty-message">No payment records found.</p>
      ) : (
        <div className="payments-list">
          {payments.map(payment => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <div className="payment-id">Transaction: {payment.transaction_id || 'N/A'}</div>
                <span className={`status-badge ${payment.payment_status}`}>
                  {payment.payment_status === 'completed' ? 'Success' : payment.payment_status}
                </span>
              </div>
              
              <div className="payment-details">
                <div className="detail-row">
                  <span className="detail-label">Booking ID:</span>
                  <span className="detail-value">#{payment.booking_id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Futsal:</span>
                  <span className="detail-value">{payment.futsal_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Slot:</span>
                  <span className="detail-value">{payment.slot_date} ({payment.start_time} - {payment.end_time})</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value price">Rs. {payment.amount}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Payment Date:</span>
                  <span className="detail-value">{formatDate(payment.payment_date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Payment Method:</span>
                  <span className="detail-value">{payment.payment_method}</span>
                </div>
                {payment.refund_status === 'completed' && (
                  <div className="detail-row refund">
                    <span className="detail-label">Refund:</span>
                    <span className="detail-value">Rs. {payment.refund_amount} refunded on {formatDate(payment.refunded_at)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;