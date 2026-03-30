import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import '../../styles/MyBookings.css';
import { useNavigate } from 'react-router-dom';

const MyBookings = () => {
  const navigate = useNavigate();
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
      year: 'numeric',
      month: 'short',
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

  const getStatusBadge = (booking) => {
    if (booking.status === 'cancelled') {
      if (booking.refund_status === 'completed') {
        return <span className="status-badge refunded">Refunded</span>;
      }
      return <span className="status-badge cancelled">Cancelled</span>;
    }
    if (booking.is_past) {
      return <span className="status-badge completed">Completed</span>;
    }
    return <span className="status-badge confirmed">Confirmed</span>;
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
          <p className="subtitle">View and manage your bookings</p>

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
              {bookings.map((booking) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <div>
                      <h3>{booking.futsal_name}</h3>
                      <p className="location">{booking.location}</p>
                    </div>
                    {getStatusBadge(booking)}
                  </div>

                  <div className="booking-details">
                    <div className="detail-row">
                      <span className="label">Date</span>
                      <span className="value">{formatDate(booking.slot_date)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Time</span>
                      <span className="value">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Price</span>
                      <span className="value price">Rs. {booking.price}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Payment</span>
                      <span className={`payment-status ${booking.payment_status}`}>
                        {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    
                    {booking.refund_status === 'completed' && booking.refund_amount > 0 && (
                      <div className="detail-row">
                        <span className="label">Refund</span>
                        <span className="value refund">Rs. {booking.refund_amount} refunded</span>
                      </div>
                    )}
                    
                    {booking.refund_status === 'pending' && (
                      <div className="detail-row">
                        <span className="label">Refund</span>
                        <span className="value refund-pending">Processing</span>
                      </div>
                    )}
                    
                    {booking.refund_status === 'failed' && (
                      <div className="detail-row">
                        <span className="label">Refund</span>
                        <span className="value refund-failed">Failed - Contact support</span>
                      </div>
                    )}
                    
                    {booking.status === 'confirmed' && !booking.is_past && (
                      <div className="detail-row">
                        <span className="label">Cancel by</span>
                        <span className="value deadline">{formatDateTime(booking.cancel_deadline)}</span>
                      </div>
                    )}
                  </div>

                  <div className="booking-actions">
                    {booking.status === 'confirmed' && !booking.is_past && booking.can_cancel && (
                      <button 
                        className="btn-cancel"
                        onClick={() => handleCancel(booking)}
                        disabled={cancelling === booking.id}
                      >
                        {cancelling === booking.id ? "Processing..." : "Cancel Booking"}
                      </button>
                    )}
                    
                    {booking.status === 'confirmed' && !booking.is_past && !booking.can_cancel && (
                      <div className="cancel-note">
                        Cancellation available 2 hours before slot
                      </div>
                    )}
                    
                    {booking.is_past && (
                      <div className="completed-note">Completed</div>
                    )}
                    
                    <button 
                      className="btn-details"
                      onClick={() => window.location.href = `/booking/${booking.id}`}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
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
                <p><strong>{selectedBooking.futsal_name}</strong></p>
                <p>{formatDate(selectedBooking.slot_date)} | {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}</p>
                <p>Amount: Rs. {selectedBooking.price}</p>
              </div>
              {selectedBooking.status === 'confirmed' && (
                <div className="refund-info">
                  Refund of Rs. {selectedBooking.price} will be processed within 5-7 business days.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfirmModal(false)}>
                No, Keep It
              </button>
              <button className="btn-danger" onClick={confirmCancel} disabled={cancelling === selectedBooking.id}>
                {cancelling === selectedBooking.id ? 'Processing...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;