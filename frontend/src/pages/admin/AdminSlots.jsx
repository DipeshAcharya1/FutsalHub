import React, { useState } from "react";

const AdminSlots = ({ slots, canModify, settings, onAddSlot, onEditSlot, onToggleSlot, onDeleteSlot, bookings, onOpenSettings, onOpenGenerate }) => {
  const [showExpired, setShowExpired] = useState(false);
  
  const handleToggle = async (slot) => {
    try {
      await onToggleSlot(slot);
    } catch (error) {
      console.error("Toggle failed:", error);
    }
  };

  const getPriceDisplay = (slot) => {
    if (slot.price_type === 'peak') {
      return <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>Rs. {slot.price} <span style={{ fontSize: '11px', color: '#666' }}>(Peak)</span></span>;
    } else if (slot.price_type === 'off_peak') {
      return <span style={{ color: '#27ae60' }}>Rs. {slot.price} <span style={{ fontSize: '11px', color: '#666' }}>(Off-Peak)</span></span>;
    } else {
      return <span>Rs. {slot.price} <span style={{ fontSize: '11px', color: '#666' }}>(Custom)</span></span>;
    }
  };

  const getSlotBookingStatus = (slotId) => {
    if (!bookings) return null;
    const slotBookings = bookings.filter(booking => booking.futsal_slot_id === slotId);
    if (slotBookings.length === 0) return null;
    const hasConfirmed = slotBookings.some(b => b.status === 'confirmed');
    if (hasConfirmed) return 'confirmed';
    return null;
  };

  const isAvailable = (slot) => {
    if (slot.is_available === true || slot.is_available === 1 || slot.is_available === "1") {
      return true;
    }
    return false;
  };

  const isExpired = (slot) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const slotDateTime = new Date(slot.slot_date + 'T' + slot.end_time);
    
    if (slot.slot_date < today) return true;
    if (slot.slot_date === today && now > slotDateTime) return true;
    return false;
  };

  const today = new Date().toISOString().split('T')[0];
  
  const filteredSlots = showExpired 
    ? slots 
    : slots.filter(slot => slot.slot_date >= today);

  const getSlotsPreview = () => {
    if (!settings) return 0;
    const start = settings.open_time.split(':').map(Number);
    const end = settings.close_time.split(':').map(Number);
    const totalMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
    // No break time - slots run continuously
    return Math.floor(totalMinutes / settings.slot_duration);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Futsal Slots</h2>
          <p className="page-sub">
            Manage time slots for your futsal. 
            {!canModify && <span style={{ color: '#856404', display: 'block', marginTop: '5px' }}>View only - modifications disabled</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {canModify && (
            <>
              <button className="btn btn-secondary" onClick={onOpenSettings}>
                Settings
              </button>
              <button className="btn btn-success" onClick={onOpenGenerate}>
                Bulk Generate
              </button>
              <button className="btn btn-primary" onClick={onAddSlot}>
                + Add Single Slot
              </button>
            </>
          )}
          <button 
            className={`btn ${showExpired ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowExpired(!showExpired)}
            style={{ fontSize: '14px' }}
          >
            {showExpired ? "Hide Expired" : "Show Expired"}
          </button>
        </div>
      </div>

      {settings && (
        <div className="info-card">
          <div className="info-grid">
            <div><strong>Hours:</strong> {settings.open_time} - {settings.close_time}</div>
            <div><strong>Slot Duration:</strong> {settings.slot_duration} minutes</div>
            <div><strong>Default Price:</strong> Rs. {settings.default_price}</div>
            <div><strong>Slots Per Day:</strong> {getSlotsPreview()}</div>
          </div>
        </div>
      )}

      {showExpired && (
        <div className="info-message" style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '8px', 
          padding: '10px 15px', 
          marginBottom: '20px',
          color: '#856404'
        }}>
          <span>ℹ️</span> Showing all slots including expired ones. Expired slots cannot be edited.
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time Slot</th>
                <th>Date</th>
                <th>Price (Rs.)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlots.length > 0 ? (
                filteredSlots.map(slot => {
                  const available = isAvailable(slot);
                  const expired = isExpired(slot);
                  const bookingStatus = getSlotBookingStatus(slot.id);
                  const isEditable = !bookingStatus && !expired;
                  
                  let statusText = 'Available';
                  let statusClass = 'status-available';
                  
                  if (expired) {
                    statusText = 'Expired';
                    statusClass = 'status-expired';
                  } else if (bookingStatus === 'confirmed') {
                    statusText = 'Booked';
                    statusClass = 'status-confirmed';
                  } else if (!available) {
                    statusText = 'Unavailable';
                    statusClass = 'status-unavailable';
                  }
                  
                  return (
                    <tr key={slot.id} className={bookingStatus ? 'booked-slot' : expired ? 'expired-slot' : ''}>
                      <td><strong>{slot.start_time} - {slot.end_time}</strong></td>
                      <td>{slot.slot_date}</td>
                      <td>Rs. {slot.price}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td>
                        {canModify && !expired && !bookingStatus && (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <button className="action-btn" onClick={() => onEditSlot(slot)}>Edit</button>
                            <button className="action-btn" onClick={() => handleToggle(slot)}>
                              {available ? "Disable" : "Enable"}
                            </button>
                            <button className="action-btn action-btn-danger" onClick={() => onDeleteSlot(slot)}>Delete</button>
                          </div>
                        )}
                        {expired && <span className="small-text">Expired - No actions</span>}
                        {bookingStatus && !expired && <span className="small-text">Booked - Cannot modify</span>}
                        {!canModify && <span className="small-text">No actions</span>}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="empty-row">
                    {showExpired ? "No slots found." : "No future slots found. Configure settings and click Bulk Generate to create slots."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {!showExpired && filteredSlots.length > 0 && (
        <div style={{ marginTop: '15px', textAlign: 'center', color: '#6c757d', fontSize: '12px' }}>
          Showing only upcoming slots. <button 
            onClick={() => setShowExpired(true)} 
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Click here
          </button> to view expired slots.
        </div>
      )}
    </div>
  );
};

export default AdminSlots;