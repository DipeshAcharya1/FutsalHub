import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "../../styles/FutsalDetails.css";

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { futsal, slot, date, bookingId } = location.state || {};

  // Redirect if no state
  if (!futsal || !slot || !date) {
    navigate("/futsals");
    return null;
  }

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="futsal-details-page">
      <Header />
      
      <main className="futsal-details-main">
        <div className="booking-step success-step">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <h2>Booking Confirmed!</h2>
            <p>Your booking has been successfully created.</p>
            
            <div className="booking-details">
              <p><strong>Booking ID:</strong> #{bookingId}</p>
              <p><strong>Futsal:</strong> {futsal.name}</p>
              <p><strong>Date:</strong> {formatDate(date)}</p>
              <p><strong>Time:</strong> {formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
              <p><strong>Amount:</strong> {slot.formatted_price}</p>
              <p><strong>Payment Status:</strong> Pending</p>
            </div>

            <div className="success-actions">
              <button 
                className="book-another-btn"
                onClick={() => navigate(`/futsal/${futsal.id}`)}
              >
                Book Another Slot
              </button>
              <button 
                className="view-bookings-btn"
                onClick={() => navigate("/my-bookings")}
              >
                View My Bookings
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingSuccess;