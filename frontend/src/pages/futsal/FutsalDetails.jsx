import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import api from "../../api/axios";
import FutsalHeader from "./FutsalHeader";
import "../../styles/FutsalDetails.css";

const FutsalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [futsal, setFutsal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [slotsByDate, setSlotsByDate] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState(null);

  useEffect(() => {
    fetchFutsalDetails();
  }, [id]);

  const fetchFutsalDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/futsals/${id}`);
      if (response.data.success) {
        setFutsal(response.data.data);
        
        if (response.data.data.slots_by_date && response.data.data.slots_by_date.length > 0) {
          const dates = response.data.data.slots_by_date.map(item => item.date);
          setAvailableDates(dates);
          setSlotsByDate(response.data.data.slots_by_date);
        }
      }
    } catch (err) {
      console.error("Failed to fetch futsal details:", err);
      setError("Failed to load futsal details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // DIRECT PAYMENT - No booking created
  const handleBookSlot = async (slot, date) => {
    if (!isSlotValid(slot, date)) {
      alert("This slot has already passed and cannot be booked.");
      return;
    }
    
    if (!slot.is_available) {
      alert("This slot is no longer available.");
      return;
    }
    
    setBookingSlotId(slot.id);
    
    try {
      const response = await api.post('/khalti/initiate', {
        slot_id: slot.id,
        amount: slot.price,
        futsal_id: futsal.id,
        booking_date: date
      });

      if (response.data.success) {
        // Redirect to Khalti payment page
        window.location.href = response.data.payment_url;
      } else {
        alert(response.data.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      alert(error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setBookingSlotId(null);
    }
  };

  const isSlotValid = (slot, date) => {
    const today = new Date().toISOString().split('T')[0];
    if (date !== today) return true;
    
    const currentTime = new Date();
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;
    
    const [hours, minutes] = slot.start_time.split(':');
    const slotTimeInMinutes = parseInt(hours) * 60 + parseInt(minutes);
    
    return slotTimeInMinutes > currentTimeInMinutes;
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
        <FutsalHeader 
          futsal={futsal} 
          imageError={imageError} 
          setImageError={setImageError} 
        />

        <div className="booking-step">
          <h2>Select Date & Time</h2>
          
          {availableDates.length > 0 ? (
            <SlotSelector 
              availableDates={availableDates}
              slotsByDate={slotsByDate}
              onBookSlot={handleBookSlot}
              formatDate={formatDate}
              formatTime={formatTime}
              isSlotValid={isSlotValid}
              bookingSlotId={bookingSlotId}
            />
          ) : (
            <p className="no-slots">No available slots at the moment.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

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

const SlotSelector = ({ availableDates, slotsByDate, onBookSlot, formatDate, formatTime, isSlotValid, bookingSlotId }) => {
  const [selectedDate, setSelectedDate] = useState(availableDates[0]);
  const [availableSlots, setAvailableSlots] = useState(
    slotsByDate.find(item => item.date === availableDates[0])?.slots || []
  );

  const handleDateChange = (date) => {
    setSelectedDate(date);
    const dateGroup = slotsByDate.find(item => item.date === date);
    if (dateGroup) {
      setAvailableSlots(dateGroup.slots);
    }
  };

  return (
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

      <div className="slots-container">
        <h3>Available Slots for {formatDate(selectedDate)}</h3>
        {availableSlots.length > 0 ? (
          <div className="slots-grid">
            {availableSlots.map(slot => {
              const isValid = isSlotValid(slot, selectedDate);
              const isBookingThisSlot = bookingSlotId === slot.id;
              
              return (
                <div 
                  key={slot.id} 
                  className={`slot-card ${!slot.is_available ? 'slot-unavailable' : ''} ${!isValid ? 'slot-expired' : ''}`}
                  onClick={() => isValid && slot.is_available && onBookSlot(slot, selectedDate)}
                >
                  <div className="slot-time">
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </div>
                  <div className="slot-price">{slot.formatted_price}</div>
                  {!slot.is_available ? (
                    <button className="select-slot-btn disabled" disabled>
                      Booked
                    </button>
                  ) : !isValid ? (
                    <button className="select-slot-btn disabled" disabled>
                      Expired
                    </button>
                  ) : (
                    <button 
                      className="select-slot-btn" 
                      disabled={isBookingThisSlot}
                    >
                      {isBookingThisSlot ? "Processing..." : "Book Now"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="no-slots">No available slots for this date.</p>
        )}
      </div>
    </>
  );
};

export default FutsalDetails;