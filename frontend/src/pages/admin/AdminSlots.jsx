import React, { useState } from "react";

const AdminSlots = ({ slots, canModify, onAddSlot, onEditSlot, onToggleSlot, onDeleteSlot, bookings }) => {
  const [showExpired, setShowExpired] = useState(false);
  
  const handleToggle = async (slot) => {
    try {
      await onToggleSlot(slot);
    } catch (error) {
      console.error("Toggle failed:", error);
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
  
  // Filter slots based on showExpired toggle
  const filteredSlots = showExpired 
    ? slots 
    : slots.filter(slot => slot.slot_date >= today);

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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className={`btn ${showExpired ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowExpired(!showExpired)}
            style={{ fontSize: '14px' }}
          >
            {showExpired ? "Hide Expired Slots" : "Show Expired Slots"}
          </button>
          {canModify && (
            <button className="btn btn-primary" onClick={onAddSlot}>Add New Slot</button>
          )}
        </div>
      </div>

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
                <th>ID</th>
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
                      <td>{slot.id}</td>
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
                              {available ? "Mark Unavailable" : "Mark Available"}
                            </button>
                            <button className="action-btn action-btn-danger" onClick={() => onDeleteSlot(slot)}>Delete</button>
                          </div>
                        )}
                        {expired && <span className="small-text" style={{ color: '#6c757d' }}>Expired - No actions</span>}
                        {bookingStatus && !expired && <span className="small-text" style={{ color: '#0c5460' }}>Booked - Cannot modify</span>}
                        {!canModify && <span className="small-text">No actions</span>}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="empty-row">
                    {showExpired ? "No slots found." : "No future slots found. Click Add New Slot to create one."}
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