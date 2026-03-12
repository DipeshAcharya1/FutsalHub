import React from "react";

const AdminSlots = ({ slots, canModify, onAddSlot, onEditSlot, onToggleSlot, onDeleteSlot }) => {
  
  const handleToggle = async (slot) => {
    try {
      await onToggleSlot(slot);
    } catch (error) {
      console.error("Toggle failed:", error);
    }
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
        {canModify && (
          <button className="btn btn-primary" onClick={onAddSlot}>Add New Slot</button>
        )}
      </div>

      <div className="card">
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
            {slots.map(slot => (
              <tr key={slot.id}>
                <td>{slot.id}</td>
                <td>{slot.start_time && slot.end_time ? `${slot.start_time} - ${slot.end_time}` : "N/A"}</td>
                <td>{slot.slot_date || "N/A"}</td>
                <td>Rs. {slot.price || "N/A"}</td>
                <td>
                  <span className={slot.is_available === false ? "status-badge status-unavailable" : "status-badge status-available"}>
                    {slot.is_available === false ? "No" : "Yes"}
                  </span>
                </td>
                <td>
                  {canModify ? (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button 
                        className="action-btn" 
                        onClick={() => onEditSlot(slot)}
                      >
                        Edit
                      </button>
                      <button 
                        className="action-btn" 
                        onClick={() => handleToggle(slot)}
                      >
                        {slot.is_available === false ? "Mark Available" : "Mark Unavailable"}
                      </button>
                      <button 
                        className="action-btn action-btn-danger" 
                        onClick={() => onDeleteSlot(slot)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span className="small-text">No actions</span>
                  )}
                </td>
              </tr>
            ))}
            {slots.length === 0 && (
              <tr><td colSpan={6} className="empty-row">No slots found. {canModify && "Click Add New Slot to create one."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSlots;