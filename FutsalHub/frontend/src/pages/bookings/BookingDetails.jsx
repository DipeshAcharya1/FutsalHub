import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import api from "../../api/axios";
import "../../styles/BookingDetails.css";

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bookings/${id}`);
      setBooking(response.data.data);
    } catch (err) {
      setError("Failed to load booking details");
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

  if (loading) {
    return (
      <div className="booking-details-page">
        <Header />
        <main className="details-main">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="booking-details-page">
        <Header />
        <main className="details-main">
          <div className="error-container">
            <h2>Oops!</h2>
            <p>{error || "Booking not found"}</p>
            <button onClick={() => navigate("/my-bookings")}>
              Back to My Bookings
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="booking-details-page">
      <Header />
      
      <main className="details-main">

        <div className="booking-detail-card">
          <div className="detail-header">
            <h1>Booking Details</h1>
            <span className={`status-badge ${booking.status}`}>
              {booking.status}
            </span>
          </div>

          <div className="detail-section">
            <h3>Futsal Information</h3>
            <p><strong>Name:</strong> {booking.futsal_name}</p>
            <p><strong>Location:</strong> {booking.location}</p>
          </div>

          <div className="detail-section">
            <h3>Booking Information</h3>
            <p><strong>Booking ID:</strong> #{booking.id}</p>
            <p><strong>Date:</strong> {formatDate(booking.booking_date)}</p>
            <p><strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
            <p><strong>Price:</strong> Rs. {booking.price}</p>
            <p>
              <strong>Payment Status:</strong> 
              <span className={`payment-status ${booking.payment_status}`}>
                {booking.payment_status}
              </span>
            </p>
            <p><strong>Booked on:</strong> {formatDate(booking.created_at)}</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingDetails;