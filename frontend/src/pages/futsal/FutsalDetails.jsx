import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import api from "../../api/axios";
import FutsalHeader from "./FutsalHeader";
import MapComponent from "../../components/MapComponent";
import ReviewForm from "../../components/reviews/ReviewForm";
import ReviewsList from "../../components/reviews/ReviewsList";
import "../../styles/FutsalDetails.css";
import "../../components/reviews/Reviews.css";

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
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchFutsalDetails();
  }, [id]);

  const fetchFutsalDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/futsals/${id}`);
      console.log('Futsal Details Response:', response.data);
      
      if (response.data.success) {
        const futsalData = response.data.data;
        setFutsal(futsalData);
        
        const restricted = futsalData.is_restricted === true;
        setIsRestricted(restricted);
        
        if (restricted) {
          setRestrictedMessage(futsalData.restricted_message || 'You have been restricted from booking at this futsal.');
          setLoading(false);
          return;
        }
        
        if (futsalData.slots_by_date && futsalData.slots_by_date.length > 0) {
          const dates = futsalData.slots_by_date.map(item => item.date);
          setAvailableDates(dates);
          setSlotsByDate(futsalData.slots_by_date);
          const firstDate = dates[0];
          setSelectedDate(firstDate);
          
          // Log slots to debug
          const firstDateSlots = futsalData.slots_by_date.find(item => item.date === firstDate)?.slots || [];
          console.log('Slots for first date:', firstDateSlots);
          console.log('Slot availability check:', firstDateSlots.map(s => ({ id: s.id, is_available: s.is_available, start_time: s.start_time })));
          
          setAvailableSlots(firstDateSlots);
        }
      }
    } catch (err) {
      console.error("Failed to fetch futsal details:", err);
      setError("Failed to load futsal details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    const dateGroup = slotsByDate.find(item => item.date === date);
    const slots = dateGroup?.slots || [];
    console.log(`Slots for date ${date}:`, slots);
    setAvailableSlots(slots);
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
    
    if (date > today) return true;
    if (date === today) return slotTimeInMinutes > currentTimeInMinutes;
    return false;
  };

  // Check if slot is booked (handle different possible values)
  const isSlotBooked = (slot) => {
    // Check is_available - could be boolean, 0/1, "0"/"1", true/false
    if (slot.is_available === false || slot.is_available === 0 || slot.is_available === "0") {
      return true;
    }
    // Also check if there's a booking status
    if (slot.booking_status === 'confirmed') {
      return true;
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
      alert("This slot has already passed.");
      return;
    }
    
    if (isSlotBooked(slot)) {
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
      alert("This slot has already passed.");
      return;
    }
    if (isSlotBooked(slot)) {
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
      alert("Please select at least one slot.");
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
        if (response.data.pidx) localStorage.setItem('last_bulk_pidx', response.data.pidx);
        if (response.data.bulk_booking_id) localStorage.setItem('last_bulk_booking_id', response.data.bulk_booking_id);
        window.location.href = response.data.payment_url;
      } else {
        alert(response.data.message || 'Payment initiation failed');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setBookingSlotId(null);
    }
  };

  const getTotalPrice = () => selectedSlots.reduce((sum, slot) => sum + slot.price, 0);
  const clearSelection = () => setSelectedSlots([]);

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

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

        {/* Side by Side - Info & Map */}
        <div className="info-map-row">
          {/* Left Column - Futsal Information */}
          <div className="info-card">
            <div className="info-card-header">
              <h3>About {futsal.futsal_name}</h3>
            </div>
            <div className="info-details">
              <div className="info-detail-item">
                <span className="detail-icon">📍</span>
                <div className="detail-text">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{futsal.location}</span>
                </div>
              </div>
              <div className="info-detail-item">
                <span className="detail-icon">📞</span>
                <div className="detail-text">
                  <span className="detail-label">Contact Number</span>
                  <span className="detail-value">{futsal.contact_number || 'N/A'}</span>
                </div>
              </div>
            </div>
            {futsal.description && (
              <div className="info-description">
                <p>{futsal.description}</p>
              </div>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="map-card">
            <div className="map-card-header">
              <h3>Location Map</h3>
            </div>
            <MapComponent 
              location={futsal.location}
              latitude={futsal.latitude}
              longitude={futsal.longitude}
              futsalName={futsal.futsal_name}
            />
            <div className="map-address-footer">
              📍 {futsal.location}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="reviews-wrapper">
          <div className="reviews-header-section">
            <h3>Customer Reviews</h3>
            {user && user.id && (
              <button className="write-review-btn-small" onClick={() => setShowReviewModal(true)}>
                Write a Review
              </button>
            )}
          </div>
          <ReviewsList 
            futsalId={futsal.id} 
            currentUserId={user?.id}
            onReviewChanged={() => fetchFutsalDetails()}
          />
        </div>

        {/* Booking Section */}
        <div className="booking-wrapper">
          <div className="booking-header-section">
            <div className="mode-tabs">
              <button 
                className={`mode-tab ${bookingMode === 'single' ? 'active' : ''}`}
                onClick={() => { setBookingMode('single'); setSelectedSlots([]); }}
              >
                Single Slot
              </button>
              <button 
                className={`mode-tab ${bookingMode === 'multiple' ? 'active' : ''}`}
                onClick={() => { setBookingMode('multiple'); setSelectedSlots([]); }}
              >
                Multiple Slots
              </button>
            </div>
          </div>

          <div className="booking-content">
            <div className="date-selection">
              <label>Select Date</label>
              <select value={selectedDate || ''} onChange={(e) => handleDateChange(e.target.value)}>
                {availableDates.map(date => <option key={date} value={date}>{formatDate(date)}</option>)}
              </select>
            </div>

            <div className="slots-area">
              {availableSlots.length > 0 ? (
                <>
                  <div className="slots-grid-modern">
                    {availableSlots.map(slot => {
                      const isValid = isSlotValid(slot, selectedDate);
                      const isSelected = selectedSlots.find(s => s.id === slot.id);
                      const isExpired = !isValid;
                      const isBooked = isSlotBooked(slot);
                      
                      let slotStatus = '', statusClass = '', buttonDisabled = true, buttonText = '';
                      
                      if (isBooked) {
                        slotStatus = 'Booked'; 
                        statusClass = 'booked'; 
                        buttonText = 'Booked'; 
                        buttonDisabled = true;
                      } else if (isExpired) {
                        slotStatus = 'Expired'; 
                        statusClass = 'expired'; 
                        buttonText = 'Expired'; 
                        buttonDisabled = true;
                      } else {
                        slotStatus = 'Available'; 
                        statusClass = 'available'; 
                        buttonText = bookingSlotId === slot.id ? "Processing..." : "Book Now"; 
                        buttonDisabled = false;
                      }
                      
                      return (
                        <div key={slot.id} className={`slot-modern ${statusClass} ${isSelected ? 'selected' : ''}`}>
                          <div className="slot-time-modern">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</div>
                          <div className="slot-price-modern">Rs. {slot.price.toLocaleString()}</div>
                          <div className={`slot-status-modern ${statusClass}`}>{slotStatus}</div>
                          
                          {bookingMode === 'multiple' && !isBooked && !isExpired && (
                            <label className="slot-select-modern">
                              <input type="checkbox" checked={isSelected || false} onChange={() => toggleSlotSelection(slot)} />
                              <span>Select</span>
                            </label>
                          )}
                          
                          {bookingMode === 'single' && (
                            <button className="slot-book-btn" onClick={() => handleSingleBooking(slot)} disabled={buttonDisabled}>
                              {buttonText}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {bookingMode === 'multiple' && selectedSlots.length > 0 && (
                    <div className="cart-summary-modern">
                      <div className="cart-summary-header">
                        <h4>Selected Slots ({selectedSlots.length})</h4>
                        <button className="clear-cart-modern" onClick={clearSelection}>Clear All</button>
                      </div>
                      <div className="cart-items-modern">
                        {selectedSlots.map(slot => (
                          <div key={slot.id} className="cart-item-modern">
                            <span>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                            <span>Rs. {slot.price.toLocaleString()}</span>
                            <button className="remove-cart-item" onClick={() => toggleSlotSelection(slot)}>×</button>
                          </div>
                        ))}
                      </div>
                      <div className="cart-total-modern">
                        <span>Total Amount</span>
                        <span className="cart-total-price">Rs. {getTotalPrice().toLocaleString()}</span>
                      </div>
                      <button className="checkout-modern" onClick={handleMultipleBooking} disabled={bookingSlotId === 'bulk' || selectedSlots.length === 0}>
                        {bookingSlotId === 'bulk' ? "Processing..." : `Book ${selectedSlots.length} Slots`}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-slots-modern">
                  <p>No available slots for this date</p>
                  <button className="back-btn" onClick={() => navigate("/futsals")}>Browse Other Futsals</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showReviewModal && (
        <ReviewForm
          futsalId={futsal.id}
          futsalName={futsal.futsal_name}
          onReviewSubmitted={() => {
            fetchFutsalDetails();
            setShowReviewModal(false);
          }}
          onClose={() => setShowReviewModal(false)}
        />
      )}

      <Footer />
    </div>
  );
};

export default FutsalDetails;