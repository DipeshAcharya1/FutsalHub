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
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictedMessage, setRestrictedMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookingMode, setBookingMode] = useState('single');

  useEffect(() => {
    fetchFutsalDetails();
  }, [id]);

  const fetchFutsalDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/futsals/${id}`);
      if (response.data.success) {
        setFutsal(response.data.data);
        setIsRestricted(response.data.data.is_restricted || false);
        setRestrictedMessage(response.data.data.restricted_message || '');
        
        if (response.data.data.slots_by_date && response.data.data.slots_by_date.length > 0) {
          const dates = response.data.data.slots_by_date.map(item => item.date);
          setAvailableDates(dates);
          setSlotsByDate(response.data.data.slots_by_date);
          const firstDate = dates[0];
          setSelectedDate(firstDate);
          setAvailableSlots(response.data.data.slots_by_date.find(item => item.date === firstDate)?.slots || []);
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
    const dateGroup = slotsByDate.find(item => item.date === date);
    setAvailableSlots(dateGroup?.slots || []);
    setSelectedSlots([]);
  };

  const isSlotValid = (slot, date) => {
    if (!date) return false;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date();
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;
    
    const [hours, minutes] = slot.start_time.split(':');
    const slotTimeInMinutes = parseInt(hours) * 60 + parseInt(minutes);
    
    if (date > today) {
      return true;
    }
    
    if (date === today) {
      return slotTimeInMinutes > currentTimeInMinutes;
    }
    
    return false;
  };

  const toggleSlotSelection = (slot) => {
    const isValid = isSlotValid(slot, selectedDate);
    
    if (!isValid) {
      alert("This slot has already passed and cannot be booked.");
      return;
    }
    
    if (!slot.is_available) {
      alert("This slot is no longer available.");
      return;
    }
    
    const isSelected = selectedSlots.find(s => s.id === slot.id);
    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(s => s.id !== slot.id));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const handleSingleBooking = async (slot) => {
    if (isRestricted) {
      alert(restrictedMessage);
      return;
    }
    
    if (!isSlotValid(slot, selectedDate)) {
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
        booking_date: selectedDate
      });

      if (response.data.success) {
        // Store the transaction data for verification
        if (response.data.transaction_id) {
          localStorage.setItem('last_payment_transaction_id', response.data.transaction_id);
        }
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

  const handleMultipleBooking = async () => {
    if (isRestricted) {
      alert(restrictedMessage);
      return;
    }
    
    if (selectedSlots.length === 0) {
      alert("Please select at least one slot to book.");
      return;
    }
    
    setBookingSlotId('bulk');
    
    try {
      const response = await api.post('/khalti/initiate-bulk', {
        slots: selectedSlots.map(slot => ({
          slot_id: slot.id,
          amount: slot.price,
          futsal_id: futsal.id,
          booking_date: selectedDate,
          start_time: slot.start_time,
          end_time: slot.end_time
        })),
        total_amount: selectedSlots.reduce((sum, slot) => sum + slot.price, 0),
        total_slots: selectedSlots.length
      });

      if (response.data.success) {
        // Store the bulk booking data for verification
        console.log('Bulk payment initiated:', {
          pidx: response.data.pidx,
          bulk_booking_id: response.data.bulk_booking_id,
          payment_url: response.data.payment_url
        });
        
        // Store in localStorage for debugging and verification
        if (response.data.pidx) {
          localStorage.setItem('last_bulk_pidx', response.data.pidx);
        }
        if (response.data.bulk_booking_id) {
          localStorage.setItem('last_bulk_booking_id', response.data.bulk_booking_id);
        }
        
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

  const getTotalPrice = () => {
    return selectedSlots.reduce((sum, slot) => sum + slot.price, 0);
  };

  const clearSelection = () => {
    setSelectedSlots([]);
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
            <button className="back-btn" onClick={() => navigate("/futsals")}>Back to Futsals</button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isRestricted) {
    return (
      <div className="futsal-details-page">
        <Header />
        <main className="futsal-details-main">
          <FutsalHeader futsal={futsal} imageError={imageError} setImageError={setImageError} />
          <div className="restricted-warning">
            <div className="warning-icon">⚠️</div>
            <h3>Booking Restricted</h3>
            <p>{restrictedMessage}</p>
            <button className="back-btn" onClick={() => navigate("/futsals")}>Browse Other Futsals</button>
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
        <FutsalHeader futsal={futsal} imageError={imageError} setImageError={setImageError} />

        {/* Booking Mode Selector */}
        <div className="booking-mode-selector">
          <button 
            className={`mode-btn ${bookingMode === 'single' ? 'active' : ''}`}
            onClick={() => { setBookingMode('single'); setSelectedSlots([]); }}
          >
            Single Slot
          </button>
          <button 
            className={`mode-btn ${bookingMode === 'multiple' ? 'active' : ''}`}
            onClick={() => { setBookingMode('multiple'); setSelectedSlots([]); }}
          >
            Multiple Slots
          </button>
        </div>

        <div className="booking-step">
          <h2>Select Date & Time</h2>
          
          <div className="date-selector">
            <label>Select Date:</label>
            <select value={selectedDate || ''} onChange={(e) => handleDateChange(e.target.value)} className="date-select">
              {availableDates.map(date => <option key={date} value={date}>{formatDate(date)}</option>)}
            </select>
          </div>

          <div className="slots-container">
            <h3>Available Slots for {selectedDate ? formatDate(selectedDate) : ''}</h3>
            {availableSlots.length > 0 ? (
              <>
                <div className="slots-grid">
                  {availableSlots.map(slot => {
                    const isValid = isSlotValid(slot, selectedDate);
                    const isSelected = selectedSlots.find(s => s.id === slot.id);
                    const isBookingThisSlot = bookingSlotId === slot.id;
                    const isExpired = !isValid;
                    
                    return (
                      <div 
                        key={slot.id} 
                        className={`slot-card ${!slot.is_available ? 'slot-unavailable' : ''} ${isExpired ? 'slot-expired' : ''} ${isSelected ? 'slot-selected' : ''}`}
                      >
                        <div className="slot-time">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</div>
                        <div className="slot-price">{slot.formatted_price}</div>
                        
                        {bookingMode === 'multiple' && (
                          <div className="slot-checkbox">
                            <input 
                              type="checkbox" 
                              checked={isSelected || false}
                              onChange={() => toggleSlotSelection(slot)}
                              disabled={isExpired || !slot.is_available}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className={isExpired || !slot.is_available ? 'disabled' : ''}>
                              {isExpired ? 'Expired' : (slot.is_available ? 'Select' : 'Booked')}
                            </span>
                          </div>
                        )}
                        
                        {bookingMode === 'single' && (
                          <>
                            {!slot.is_available && (
                              <button className="select-slot-btn disabled" disabled>Booked</button>
                            )}
                            {isExpired && slot.is_available && (
                              <button className="select-slot-btn disabled" disabled>Expired</button>
                            )}
                            {!isExpired && slot.is_available && (
                              <button 
                                className="select-slot-btn" 
                                onClick={() => handleSingleBooking(slot)} 
                                disabled={isBookingThisSlot}
                              >
                                {isBookingThisSlot ? "Processing..." : "Book Now"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bulk Booking Summary */}
                {bookingMode === 'multiple' && selectedSlots.length > 0 && (
                  <div className="bulk-summary">
                    <div className="summary-header">
                      <h3>Selected Slots ({selectedSlots.length})</h3>
                      <button className="clear-selection-btn" onClick={clearSelection}>Clear All</button>
                    </div>
                    <div className="selected-slots-list">
                      {selectedSlots.map(slot => (
                        <div key={slot.id} className="selected-slot-item">
                          <span>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                          <span>{slot.formatted_price}</span>
                          <button className="remove-slot-btn" onClick={() => toggleSlotSelection(slot)}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="summary-total">
                      <strong>Total Amount:</strong>
                      <span className="total-price">Rs. {getTotalPrice().toLocaleString()}</span>
                    </div>
                    <button 
                      className="book-multiple-btn"
                      onClick={handleMultipleBooking}
                      disabled={bookingSlotId === 'bulk' || selectedSlots.length === 0}
                    >
                      {bookingSlotId === 'bulk' ? "Processing..." : `Book ${selectedSlots.length} Slots`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="no-slots">No available slots for this date.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FutsalDetails;