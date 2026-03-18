import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import api from "../../api/axios";
import "../../styles/MyBookings.css";

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await api.get("/user/bookings");
      console.log("Bookings response:", response.data);
      setBookings(response.data.data || []);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="my-bookings-page">
        <header />
      <main className="bookings-main">
        <div className="bookings-container">
          <h1>My Bookings</h1>

          {error && <div className="msg msg-error">{error}</div>}

          {loading ? (
            <p className="loading-text">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <p>You haven't made any bookings yet.</p>
              <button 
                className="btn-primary"
                onClick={() => navigate("/futsals")}
              >
                Browse Futsals
              </button>
            </div>
          ) : (
            <div className="bookings-list">
              {bookings.map((booking) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <h3>{booking.futsal_name}</h3>
                    <span className={`status-badge ${booking.status}`}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <div className="booking-details">
                    <p><strong>Date:</strong> {formatDate(booking.booking_date)}</p>
                    <p><strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
                    <p><strong>Location:</strong> {booking.location}</p>
                    <p><strong>Price:</strong> Rs. {booking.price}</p>
                    <p>
                      <strong>Payment:</strong> 
                      <span className={`payment-status ${booking.payment_status}`}>
                        {booking.payment_status}
                      </span>
                    </p>
                  </div>
                  
                  <div className="booking-actions">
                    <button 
                      className="view-btn"
                      onClick={() => navigate(`/booking/${booking.id}`)}
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
    </div>
  );
};

export default MyBookings;