import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../api/axios";
import "../styles/FutsalDetails.css";

const FutsalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [futsal, setFutsal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: view details, 2: confirm booking
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchFutsalDetails();
  }, [id]);

  const fetchFutsalDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/futsals/${id}`);
      if (response.data.success) {
        setFutsal(response.data.data);
        
        // Extract unique dates from slots_by_date
        if (response.data.data.slots_by_date && response.data.data.slots_by_date.length > 0) {
          const dates = response.data.data.slots_by_date.map(item => item.date);
          setAvailableDates(dates);
          setSelectedDate(dates[0]);
          setAvailableSlots(response.data.data.slots_by_date[0].slots);
        }
      }
    } catch (err) {
      console.error("Failed to fetch futsal details:", err);
      setError("Failed to load futsal details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    
    // Find slots for selected date
    const dateGroup = futsal?.slots_by_date?.find(item => item.date === date);
    if (dateGroup) {
      setAvailableSlots(dateGroup.slots);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setBookingStep(2);
  };

  const handleBackToSlots = () => {
    setBookingStep(1);
    setSelectedSlot(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    
    // Check if user is logged in
    const token = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/futsal/${id}`);
      return;
    }

    setBookingLoading(true);
    try {
      const user = JSON.parse(userStr);
      
      const bookingData = {
        futsal_slot_id: selectedSlot.id,
        booking_date: selectedDate,
        user_id: user.id
      };

      // need to create this endpoint later
      const response = await api.post("/bookings", bookingData);
      
      if (response.data.success) {
        setBookingSuccess(true);
        setBookingStep(3);
      }
    } catch (err) {
      console.error("Booking failed:", err);
      setError(err.response?.data?.message || "Failed to create booking. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBookAnother = () => {
    setBookingStep(1);
    setSelectedSlot(null);
    setBookingSuccess(false);
  };

  const formatTime = (time) => {
    if (!time) return "";
    // Convert 24h format to 12h format
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

  if (loading) {
    return (
      <div className="futsal-details-page">
        <Header />
        <main className="futsal-details-main">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading futsal details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !futsal) {
    return (
      <div className="futsal-details-page">
        <Header />
        <main className="futsal-details-main">
          <div className="error-container">
            <h2>Oops!</h2>
            <p>{error || "Futsal not found"}</p>
            <button className="back-btn" onClick={() => navigate("/futsals")}>
              Back to Futsals
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="futsal-details-page">
      <Header />

      <main className="futsal-details-main">
        {/* Futsal Header */}
        <div className="futsal-header">
          <div className="futsal-image-container">
            {futsal.image && !imageError ? (
              <img 
                src={futsal.image} 
                alt={futsal.name}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="no-image">No Image Available</div>
            )}
          </div>
          <div className="futsal-info">
            <h1>{futsal.name}</h1>
            <p className="location">
              <span className="icon"></span> {futsal.location}
            </p>
            <p className="contact">
              <span className="icon"></span> {futsal.contact || "Contact not available"}
            </p>
            <p className="description">{futsal.description}</p>
          </div>
        </div>

        {/* Booking Steps */}
        {bookingStep === 1 && (
          <div className="booking-step">
            <h2>Select Date & Time</h2>
            
            {/* Date Selection */}
            {availableDates.length > 0 ? (
              <>
                <div className="date-selector">
                  <label>Select Date:</label>
                  <select 
                    value={selectedDate} 
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="date-select"
                  >
                    {availableDates.map(date => (
                      <option key={date} value={date}>
                        {formatDate(date)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Slots */}
                <div className="slots-container">
                  <h3>Available Slots for {selectedDate && formatDate(selectedDate)}</h3>
                  {availableSlots.length > 0 ? (
                    <div className="slots-grid">
                      {availableSlots.map(slot => (
                        <div 
                          key={slot.id} 
                          className={`slot-card ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                          onClick={() => handleSlotSelect(slot)}
                        >
                          <div className="slot-time">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          <div className="slot-price">{slot.formatted_price}</div>
                          <button className="select-slot-btn">
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-slots">No available slots for this date.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="no-slots">No available slots at the moment.</p>
            )}
          </div>
        )}

        {bookingStep === 2 && selectedSlot && (
          <div className="booking-step confirm-step">
            <h2>Confirm Your Booking</h2>
            
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
                    <strong>Date:</strong> {formatDate(selectedDate)}
                  </p>
                  <p>
                    <strong>Time:</strong> {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                  </p>
                  <p>
                    <strong>Price:</strong> {selectedSlot.formatted_price}
                  </p>
                  <p className="total">
                    <strong>Total Amount:</strong> {selectedSlot.formatted_price}
                  </p>
                </div>
              </div>

              <div className="booking-actions">
                <button 
                  className="back-btn"
                  onClick={handleBackToSlots}
                  disabled={bookingLoading}
                >
                  Back to Slots
                </button>
                <button 
                  className="confirm-btn"
                  onClick={handleConfirmBooking}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? "Processing..." : "Confirm Booking"}
                </button>
              </div>
            </div>
          </div>
        )}

        {bookingStep === 3 && bookingSuccess && (
          <div className="booking-step success-step">
            <div className="success-card">
              <div className="success-icon">✓</div>
              <h2>Booking Confirmed!</h2>
              <p>Your booking has been successfully created.</p>
              <div className="booking-details">
                <p><strong>Futsal:</strong> {futsal.name}</p>
                <p><strong>Date:</strong> {formatDate(selectedDate)}</p>
                <p><strong>Time:</strong> {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}</p>
                <p><strong>Amount:</strong> {selectedSlot.formatted_price}</p>
              </div>
              <div className="success-actions">
                <button 
                  className="book-another-btn"
                  onClick={handleBookAnother}
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
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default FutsalDetails;