import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import api from "../../api/axios";
import FutsalHeader from "./FutsalHeader";
import MapComponent from "../../components/MapComponent";
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
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        const futsalData = response.data.data;
        setFutsal(futsalData);
        
        const restricted = futsalData.is_restricted === true;
        setIsRestricted(restricted);
        
        if (restricted) {
          setRestrictedMessage(futsalData.restricted_message || 'You have been restricted from booking at this futsal. Please contact the administrator.');
          setLoading(false);
          return;
        }
        
        if (futsalData.slots_by_date && futsalData.slots_by_date.length > 0) {
          const dates = futsalData.slots_by_date.map(item => item.date);
          setAvailableDates(dates);
          setSlotsByDate(futsalData.slots_by_date);
          const firstDate = dates[0];
          setSelectedDate(firstDate);
          setAvailableSlots(futsalData.slots_by_date.find(item => item.date === firstDate)?.slots || []);
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
    if (isRestricted) {
      alert(restrictedMessage);
      return;
    }
    
    const isValid = isSlotValid(slot, selectedDate);
    
    if (!isValid) {
      alert("This slot has already passed and cannot be booked.");
      return;
    }
    
    if (!slot.is_available) {
      alert("This slot is already booked.");
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
      alert("This slot is already booked.");
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

  // Show restricted message FIRST if user is restricted
  if (!loading && isRestricted) {
    return (
      <div className="futsal-details-page">
        <Header />
        <main className="futsal-details-main">
          <FutsalHeader futsal={futsal} imageError={imageError} setImageError={setImageError} />
          <div className="restricted-warning">
            <div className="warning-icon">🚫</div>
            <h3>Access Restricted</h3>
            <p>{restrictedMessage}</p>
            <button className="back-btn" onClick={() => navigate("/futsals")}>Browse Other Futsals</button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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

  return (
    <div className="futsal-details-page">
      <Header />
      <main className="futsal-details-main">
        <FutsalHeader futsal={futsal} imageError={imageError} setImageError={setImageError} />

        {/* Futsal Information Section with Map */}
        <div className="futsal-info-card">
          {/* Show coordinates if available */}
          {futsal.latitude && futsal.longitude && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '15px', padding: '8px', background: '#f8f9fa', borderRadius: '8px' }}>
              🗺️ Coordinates: {futsal.latitude}, {futsal.longitude}
            </div>
          )}
          
          {/* Map Section */}
          <div className="map-section">
            <h4>Location Map</h4>
            <MapComponent 
              location={futsal.location}
              latitude={futsal.latitude}
              longitude={futsal.longitude}
              futsalName={futsal.futsal_name}
            />
          </div>
        </div>

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
                    const isBooked = !slot.is_available;
                    
                    let slotStatus = '';
                    let statusClass = '';
                    let buttonDisabled = true;
                    let buttonText = '';
                    
                    if (isBooked) {
                      slotStatus = 'Booked';
                      statusClass = 'slot-booked';
                      buttonText = 'Booked';
                      buttonDisabled = true;
                    } else if (isExpired) {
                      slotStatus = 'Expired';
                      statusClass = 'slot-expired';
                      buttonText = 'Expired';
                      buttonDisabled = true;
                    } else {
                      slotStatus = 'Available';
                      statusClass = '';
                      buttonText = isBookingThisSlot ? "Processing..." : "Book Now";
                      buttonDisabled = false;
                    }
                    
                    return (
                      <div 
                        key={slot.id} 
                        className={`slot-card ${statusClass} ${isSelected ? 'slot-selected' : ''}`}
                      >
                        <div className="slot-time">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</div>
                        <div className="slot-price">{slot.formatted_price}</div>
                        
                        <div className={`slot-status-badge ${isBooked ? 'status-booked' : isExpired ? 'status-expired' : 'status-available'}`}>
                          {slotStatus}
                        </div>
                        
                        {bookingMode === 'multiple' && (
                          <div className="slot-checkbox">
                            <input 
                              type="checkbox" 
                              checked={isSelected || false}
                              onChange={() => toggleSlotSelection(slot)}
                              disabled={isBooked || isExpired}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className={isBooked || isExpired ? 'disabled' : ''}>
                              {isBooked ? 'Booked' : isExpired ? 'Expired' : 'Select'}
                            </span>
                          </div>
                        )}
                        
                        {bookingMode === 'single' && (
                          <button 
                            className={`select-slot-btn ${buttonDisabled ? 'disabled' : ''}`}
                            onClick={() => handleSingleBooking(slot)} 
                            disabled={buttonDisabled}
                          >
                            {buttonText}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

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