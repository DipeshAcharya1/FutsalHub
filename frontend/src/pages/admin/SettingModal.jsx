import React, { useState, useEffect } from "react";

const SettingsModal = ({ settings, onSave, onClose, loading }) => {
  const [formData, setFormData] = useState({
    open_time: "06:00",
    close_time: "22:00",
    slot_duration: 60,
    break_time: 15,
    default_price: 1500,
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const calculateSlots = () => {
    const start = formData.open_time.split(':').map(Number);
    const end = formData.close_time.split(':').map(Number);
    const totalMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
    const slotCycle = formData.slot_duration + formData.break_time;
    return Math.floor(totalMinutes / slotCycle);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-head">
          <h3>Futsal Settings</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h4>⏰ Operating Hours</h4>
            <div className="form-row">
              <div className="form-field">
                <label>Open Time</label>
                <input type="time" value={formData.open_time} 
                  onChange={e => setFormData({...formData, open_time: e.target.value})} required />
              </div>
              <div className="form-field">
                <label>Close Time</label>
                <input type="time" value={formData.close_time} 
                  onChange={e => setFormData({...formData, close_time: e.target.value})} required />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>⚽ Slot Settings</h4>
            <div className="form-row">
              <div className="form-field">
                <label>Slot Duration (minutes)</label>
                <input type="number" value={formData.slot_duration} 
                  onChange={e => setFormData({...formData, slot_duration: parseInt(e.target.value)})} 
                  min="30" max="180" step="15" required />
              </div>
              <div className="form-field">
                <label>Break Time (minutes)</label>
                <input type="number" value={formData.break_time} 
                  onChange={e => setFormData({...formData, break_time: parseInt(e.target.value)})} 
                  min="0" max="60" step="5" required />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>💰 Pricing</h4>
            <div className="form-field">
              <label>Default Price (Rs.)</label>
              <input type="number" value={formData.default_price} 
                onChange={e => setFormData({...formData, default_price: parseInt(e.target.value)})} 
                min="0" step="100" required />
            </div>
          </div>

          <div className="form-info">
            <h4>📊 Summary</h4>
            <p>Hours: {formData.open_time} - {formData.close_time}</p>
            <p>Each slot: {formData.slot_duration} min play + {formData.break_time} min break</p>
            <p><strong>Slots per day: {calculateSlots()}</strong></p>
            <p>Default price: Rs. {formData.default_price}</p>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;