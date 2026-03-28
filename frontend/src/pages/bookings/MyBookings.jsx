import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import '../../styles/MyBookings.css';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/user/bookings');
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (err) {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking) => {
    setSelectedBooking(booking);
    setShowConfirmModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedBooking) return;
    
    setCancelling(selectedBooking.id);
    setError(null);
    
    try {
      let response;
      
      if (selectedBooking.status === 'confirmed') {
        response = await api.post(`/bookings/${selectedBooking.id}/refund`);
      } else {
        response = await api.patch(`/bookings/${selectedBooking.id}/cancel`);
      }
      
      if (response.data.success) {
        await fetchBookings();
        setShowConfirmModal(false);
        setSelectedBooking(null);
        alert(response.data.message);
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString();
  };

  const getRefundStatusText = (refundStatus, status) => {
    if (status !== 'cancelled') return null;
    
    switch (refundStatus) {
      case 'pending':
        return { text: 'Refund Processing', class: 'refund-pending', icon: '⏳' };
      case 'completed':
        return { text: 'Refunded', class: 'refund-completed', icon: '✓' };
      case 'failed':
        return { text: 'Refund Failed', class: 'refund-failed', icon: '⚠️' };
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status, paymentStatus, isExpired) => {
    if (isExpired) return 'status-expired';
    if (status === 'confirmed') return 'status-confirmed';
    if (status === 'pending') return 'status-pending';
    if (status === 'cancelled') return 'status-cancelled';
    return 'status-unknown';
  };

  const getStatusText = (status, paymentStatus, isExpired) => {
    if (isExpired) return 'Expired';
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'pending') return 'Pending Payment';
    if (status === 'cancelled') return 'Cancelled';
    return status;
  };

  if (loading) {
    return (
      <div className="my-bookings-page">
        <Header />
        <main className="my-bookings-main">
          <div className="loading-container">Loading your bookings...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="my-bookings-page">
      <Header />
      <main className="my-bookings-main">
        <div className="my-bookings-container">
          <h1>My Bookings</h1>
          <p className="page-subtitle">View and manage your upcoming bookings</p>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="empty-state">
              <p>No bookings found.</p>
              <button className="btn-primary" onClick={() => window.location.href = '/futsals'}>
                Browse Futsals
              </button>
            </div>
          ) : (
            <div className="bookings-list">
              {bookings.map((booking) => {
                const refundInfo = getRefundStatusText(booking.refund_status, booking.status);
                return (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-header">
                      <div className="booking-futsal">
                        <h3>{booking.futsal_name}</h3>
                        <span className="booking-location">{booking.location}</span>
                      </div>
                      <span className={`status-badge ${getStatusBadgeClass(booking.status, booking.payment_status, booking.is_expired)}`}>
                        {getStatusText(booking.status, booking.payment_status, booking.is_expired)}
                      </span>
                    </div>

                    <div className="booking-details">
                      <div className="detail-row">
                        <span className="detail-label">Date:</span>
                        <span className="detail-value">{formatDate(booking.slot_date)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Time:</span>
                        <span className="detail-value">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Price:</span>
                        <span className="detail-value price">Rs. {booking.price}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Payment Status:</span>
                        <span className={`payment-status ${booking.payment_status}`}>
                          {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      
                      {/* Refund Status for Cancelled Bookings */}
                      {refundInfo && (
                        <div className="detail-row refund-row">
                          <span className="detail-label">Refund Status:</span>
                          <span className={`detail-value ${refundInfo.class}`}>
                            {refundInfo.icon} {refundInfo.text}
                            {booking.refund_amount > 0 && ` - Rs. ${booking.refund_amount}`}
                            {booking.refunded_at && refundInfo.text === 'Refunded' && (
                              <span className="refund-date"> on {new Date(booking.refunded_at).toLocaleDateString()}</span>
                            )}
                          </span>
                        </div>
                      )}
                      
                      {/* Show cancellation deadline for confirmed bookings */}
                      {booking.status === 'confirmed' && !booking.is_past && (
                        <div className="detail-row">
                          <span className="detail-label">Cancel By:</span>
                          <span className="detail-value deadline">
                            {formatDateTime(booking.cancel_deadline)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="booking-actions">
                      {/* Pending bookings - need payment */}
                      {booking.status === 'pending' && !booking.is_expired && (
                        <>
                          <button 
                            className="btn-pay"
                            onClick={() => window.location.href = `/booking-confirm`}
                          >
                            Complete Payment
                          </button>
                          <button 
                            className="btn-cancel"
                            onClick={() => handleCancel(booking)}
                            disabled={cancelling === booking.id}
                          >
                            {cancelling === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                          </button>
                        </>
                      )}
                      
                      {/* Confirmed bookings - can cancel BEFORE 2 hours */}
                      {booking.status === 'confirmed' && booking.can_cancel && (
                        <button 
                          className="btn-cancel-refund"
                          onClick={() => handleCancel(booking)}
                          disabled={cancelling === booking.id}
                        >
                          {cancelling === booking.id ? 'Processing...' : 'Cancel & Refund'}
                        </button>
                      )}
                      
                      {/* Confirmed bookings - cannot cancel (less than 2 hours left) */}
                      {booking.status === 'confirmed' && !booking.can_cancel && !booking.is_past && (
                        <div className="cancel-notice">
                          <span>⚠️ Cancellation available only before {formatDateTime(booking.cancel_deadline)}</span>
                          <small>(2 hours before slot time)</small>
                        </div>
                      )}
                      
                      {/* Cancelled bookings with refund info */}
                      {booking.status === 'cancelled' && booking.refund_status === 'pending' && (
                        <div className="refund-notice pending">
                          <span>⏳ Refund processing. Will be credited in 5-7 business days.</span>
                        </div>
                      )}
                      
                      {booking.status === 'cancelled' && booking.refund_status === 'failed' && (
                        <div className="refund-notice failed">
                          <span>⚠️ Refund failed. Please contact support.</span>
                        </div>
                      )}
                      
                      {/* Past bookings */}
                      {booking.is_past && (
                        <div className="past-booking-notice">
                          <span>✓ Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Confirmation Modal */}
      {showConfirmModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cancel Booking</h3>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to cancel this booking?</p>
              <div className="booking-summary">
                <p><strong>Futsal:</strong> {selectedBooking.futsal_name}</p>
                <p><strong>Date:</strong> {formatDate(selectedBooking.slot_date)}</p>
                <p><strong>Time:</strong> {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}</p>
                <p><strong>Amount:</strong> Rs. {selectedBooking.price}</p>
              </div>
              {selectedBooking.status === 'confirmed' && (
                <div className="refund-info">
                  <p>⚠️ Refund of Rs. {selectedBooking.price} will be processed to your original payment method within 5-7 business days.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfirmModal(false)}>
                No, Keep It
              </button>
              <button className="btn-danger" onClick={confirmCancel} disabled={cancelling === selectedBooking.id}>
                {cancelling === selectedBooking.id ? 'Processing...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;