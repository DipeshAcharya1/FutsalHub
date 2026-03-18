import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import api from "../../api/axios";
import "../../styles/FutsalDetails.css";

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { futsal, slot, date } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleConfirmBooking = async () => {
    const token = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
        navigate(`/login?redirect=/futsal/${futsal.id}/confirm-booking`);
        return;
    }

    setLoading(true);
    setError(null);

    try {
        const user = JSON.parse(userStr);
        
        const bookingData = {
        futsal_slot_id: slot.id,
        booking_date: date,
        };

        console.log("Sending booking data:", bookingData);
        
        const response = await api.post("/bookings", bookingData);
        
        console.log("Booking response:", response.data);
        
        if (response.data.success) {
        navigate("/booking/success", {
            state: {
            futsal,
            slot,
            date,
            bookingId: response.data.data.booking.id
            }
        });
        }
    } catch (err) {
        console.error("Booking failed:", err);
        console.error("Error response:", err.response);
        
        if (err.response?.status === 422) {
        setError("Validation error: " + JSON.stringify(err.response.data.errors));
        } else if (err.response?.status === 401) {
        setError("Please login to continue");
        setTimeout(() => navigate("/login"), 2000);
        } else {
        setError(err.response?.data?.message || "Failed to create booking. Please try again.");
        }
    } finally {
        setLoading(false);
    }
    };

  const handleBack = () => {
    navigate(`/futsal/${futsal.id}`, {
      state: { preserveSlots: true }
    });
  };

  return (
    <div className="futsal-details-page">
      <Header />
      
      <main className="futsal-details-main">
        <button className="back-btn" onClick={handleBack}>
          ← Back to Slots
        </button>

        <div className="booking-step confirm-step">
          <h2>Confirm Your Booking</h2>
          
          {error && <div className="msg msg-error">{error}</div>}

          <div className="booking-summary">
            <div className="summary-card">
              <h3>Booking Summary</h3>
              <div className="summary-details">
                <p>
                  <strong>Futsal:</strong> {futsal.name}
                </p>
                <p>
                  <strong>Location:</strong> {futsal.location}
                </p>
                <p>
                  <strong>Date:</strong> {formatDate(date)}
                </p>
                <p>
                  <strong>Time:</strong> {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                </p>
                <p>
                  <strong>Price:</strong> {slot.formatted_price}
                </p>
                <p className="total">
                  <strong>Total Amount:</strong> {slot.formatted_price}
                </p>
              </div>
            </div>

            <div className="booking-actions">
              <button 
                className="back-btn"
                onClick={handleBack}
                disabled={loading}
              >
                Back to Slots
              </button>
              <button 
                className="confirm-btn"
                onClick={handleConfirmBooking}
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingConfirmation;