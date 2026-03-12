import React from "react";

const SlotModal = ({ 
  slotForm, setSlotForm, slotErrors, availableStartTimes, availableEndTimes, editingSlot, onSubmit, onClose, loading 
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-head">
          <h3>{editingSlot ? "Edit Slot" : "Add New Slot"}</h3>
          <button className="modal-close-btn" onClick={onClose}>X</button>
        </div>

        <form onSubmit={onSubmit}>
          {slotErrors.general && (
            <div className="msg msg-error" style={{ marginBottom: '15px' }}>
              {slotErrors.general}
            </div>
          )}
          
          <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">Start Time</label>
              <select
                className="form-input"
                value={slotForm.start_time}
                onChange={e => setSlotForm({ ...slotForm, start_time: e.target.value })}
                required
              >
                <option value="">Select start time</option>
                {availableStartTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              {slotErrors.start_time && <span className="field-error">{slotErrors.start_time}</span>}
            </div>

            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">End Time</label>
              <select
                className="form-input"
                value={slotForm.end_time}
                onChange={e => setSlotForm({ ...slotForm, end_time: e.target.value })}
                required
              >
                <option value="">Select end time</option>
                {availableEndTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              {slotErrors.end_time && <span className="field-error">{slotErrors.end_time}</span>}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Slot Date</label>
            <input
              className="form-input"
              type="date"
              value={slotForm.slot_date}
              onChange={e => setSlotForm({ ...slotForm, slot_date: e.target.value })}
              required
            />
            {slotErrors.slot_date && <span className="field-error">{slotErrors.slot_date}</span>}
          </div>

          <div className="form-field">
            <label className="form-label">Price (Rs.)</label>
            <input
              className="form-input"
              type="number"
              value={slotForm.price}
              onChange={e => setSlotForm({ ...slotForm, price: e.target.value })}
              placeholder="e.g. 1500"
              min="0"
              required
            />
            {slotErrors.price && <span className="field-error">{slotErrors.price}</span>}
          </div>

          <div className="form-field">
            <label className="form-label">
              <input
                type="checkbox"
                checked={slotForm.is_available}
                onChange={e => setSlotForm({ ...slotForm, is_available: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Available for booking
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : editingSlot ? "Update Slot" : "Create Slot"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SlotModal;