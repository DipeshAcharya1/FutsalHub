import React from "react";

const AdminSlots = ({ slots, canModify, onAddSlot, onEditSlot, onToggleSlot, onDeleteSlot, bookings }) => {
  
  const handleToggle = async (slot) => {
    try {
      await onToggleSlot(slot);
    } catch (error) {
      console.error("Toggle failed:", error);
    }
  };

  // Helper function to check slot booking status
  const getSlotBookingStatus = (slotId) => {
    if (!bookings) return null;
    
    const slotBookings = bookings.filter(booking => booking.futsal_slot_id === slotId);
    
    if (slotBookings.length === 0) return null;
    
    // Check for confirmed bookings first (these are definite)
    const hasConfirmed = slotBookings.some(b => b.status === 'confirmed');
    if (hasConfirmed) return 'confirmed';
    
    // Then check for pending
    const hasPending = slotBookings.some(b => b.status === 'pending');
    if (hasPending) return 'pending';
    
    return null;
  };

  // Helper function to check availability (handles both boolean and number)
  const isAvailable = (slot) => {
    if (slot.is_available === true || 
        slot.is_available === 1 || 
        slot.is_available === "1" || 
        slot.is_available === "true") {
      return true;
    }
    return false;
  };

  // Filter out past slots - only show today and future
  const today = new Date().toISOString().split('T')[0];
  const futureSlots = slots.filter(slot => slot.slot_date >= today);

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
        {canModify && (
          <button className="btn btn-primary" onClick={onAddSlot}>Add New Slot</button>
        )}
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Time Slot</th>
                <th>Date</th>
                <th>Price (Rs.)</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {futureSlots.length > 0 ? (
                futureSlots.map(slot => {
                  const available = isAvailable(slot);
                  const bookingStatus = getSlotBookingStatus(slot.id);
                  
                  // Determine if slot should be editable
                  const isEditable = !bookingStatus || bookingStatus === 'pending';
                  
                  // Get status display text and class
                  let statusText = 'Available';
                  let statusClass = 'status-available';
                  
                  if (bookingStatus === 'confirmed') {
                    statusText = 'Confirmed';
                    statusClass = 'status-confirmed';
                  } else if (bookingStatus === 'pending') {
                    statusText = 'Pending';
                    statusClass = 'status-pending';
                  }
                  
                  return (
                    <tr key={slot.id} className={bookingStatus ? 'booked-slot' : ''}>
                      <td>{slot.id}</td>
                      <td>{slot.start_time && slot.end_time ? `${slot.start_time} - ${slot.end_time}` : "N/A"}</td>
                      <td>{slot.slot_date || "N/A"}</td>
                      <td>Rs. {slot.price || "N/A"}</td>
                      <td>
                        <span className={!available ? "status-badge status-unavailable" : "status-badge status-available"}>
                          {available ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        {canModify ? (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <button 
                              className="action-btn" 
                              onClick={() => onEditSlot(slot)}
                              disabled={!isEditable}
                              title={!isEditable ? "Cannot edit confirmed booking" : "Edit slot"}
                              style={!isEditable ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                              Edit
                            </button>
                            <button 
                              className="action-btn" 
                              onClick={() => handleToggle(slot)}
                              disabled={!isEditable}
                              title={!isEditable ? "Cannot change availability of confirmed booking" : "Toggle availability"}
                              style={!isEditable ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                              {available ? "Mark Unavailable" : "Mark Available"}
                            </button>
                            <button 
                              className="action-btn action-btn-danger" 
                              onClick={() => onDeleteSlot(slot)}
                              disabled={!isEditable}
                              title={!isEditable ? "Cannot delete confirmed booking" : "Delete slot"}
                              style={!isEditable ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="small-text">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="empty-row">
                    No future slots found. {canModify && "Click Add New Slot to create one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminSlots;