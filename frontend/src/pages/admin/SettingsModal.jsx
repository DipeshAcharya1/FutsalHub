import React, { useState, useEffect } from "react";

const SettingsModal = ({ settings, onSave, onClose, loading }) => {
  const [formData, setFormData] = useState({
    open_time: "06:00",
    close_time: "22:00",
    slot_duration: 60,
    default_price: 1500,
    peak_morning_start: "06:00",
    peak_morning_end: "09:00",
    peak_evening_start: "17:00",
    peak_evening_end: "21:00",
    peak_price_multiplier: 1.30,
    off_peak_price_multiplier: 1.00
  });

  useEffect(() => {
    if (settings) {
      // Convert time values to H:i format (remove seconds if present)
      const formatTime = (time) => {
        if (!time) return null;
        // If time has seconds (HH:MM:SS), remove the seconds part
        if (time.length === 8 && time[2] === ':' && time[5] === ':') {
          return time.substring(0, 5);
        }
        return time;
      };

      setFormData({
        open_time: formatTime(settings.open_time) || "06:00",
        close_time: formatTime(settings.close_time) || "22:00",
        slot_duration: settings.slot_duration || 60,
        default_price: settings.default_price || 1500,
        peak_morning_start: formatTime(settings.peak_morning_start) || "06:00",
        peak_morning_end: formatTime(settings.peak_morning_end) || "09:00",
        peak_evening_start: formatTime(settings.peak_evening_start) || "17:00",
        peak_evening_end: formatTime(settings.peak_evening_end) || "21:00",
        peak_price_multiplier: settings.peak_price_multiplier || 1.30,
        off_peak_price_multiplier: settings.off_peak_price_multiplier || 1.00
      });
    }
  }, [settings]);

  const calculateSlots = () => {
    const start = formData.open_time.split(':').map(Number);
    const end = formData.close_time.split(':').map(Number);
    const totalMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
    return Math.floor(totalMinutes / formData.slot_duration);
  };

  const peakPrice = formData.default_price * formData.peak_price_multiplier;
  const offPeakPrice = formData.default_price * formData.off_peak_price_multiplier;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure times are in correct H:i format (without seconds)
    const formatTimeForSubmit = (time) => {
      if (!time) return null;
      // If time has seconds, remove them
      if (time.length === 8 && time[2] === ':' && time[5] === ':') {
        return time.substring(0, 5);
      }
      return time;
    };

    const dataToSend = {
      open_time: formatTimeForSubmit(formData.open_time),
      close_time: formatTimeForSubmit(formData.close_time),
      slot_duration: parseInt(formData.slot_duration),
      default_price: parseFloat(formData.default_price),
      peak_morning_start: formatTimeForSubmit(formData.peak_morning_start),
      peak_morning_end: formatTimeForSubmit(formData.peak_morning_end),
      peak_evening_start: formatTimeForSubmit(formData.peak_evening_start),
      peak_evening_end: formatTimeForSubmit(formData.peak_evening_end),
      peak_price_multiplier: parseFloat(formData.peak_price_multiplier),
      off_peak_price_multiplier: parseFloat(formData.off_peak_price_multiplier)
    };
    
    console.log('Sending settings:', dataToSend);
    onSave(dataToSend);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '700px' }}>
        <div className="modal-head">
          <h3>Futsal Settings</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h4>Operating Hours</h4>
            <div className="form-row">
              <div className="form-field">
                <label>Open Time</label>
                <input 
                  type="time" 
                  value={formData.open_time} 
                  onChange={e => setFormData({...formData, open_time: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-field">
                <label>Close Time</label>
                <input 
                  type="time" 
                  value={formData.close_time} 
                  onChange={e => setFormData({...formData, close_time: e.target.value})} 
                  required 
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Slot Settings</h4>
            <div className="form-row">
              <div className="form-field">
                <label>Slot Duration (minutes)</label>
                <input 
                  type="number" 
                  value={formData.slot_duration} 
                  onChange={e => setFormData({...formData, slot_duration: parseInt(e.target.value)})} 
                  min="30" 
                  max="180" 
                  step="15" 
                  required 
                />
                <small>How long each game lasts</small>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Base Pricing</h4>
            <div className="form-field">
              <label>Base Price (Rs.)</label>
              <input 
                type="number" 
                value={formData.default_price} 
                onChange={e => setFormData({...formData, default_price: parseFloat(e.target.value)})} 
                min="0" 
                step="100" 
                required 
              />
              <small>Base price before applying peak/off-peak multipliers</small>
            </div>
          </div>

          <div className="form-section">
            <h4>Peak Hours (Higher Demand)</h4>
            <div className="info-note" style={{ background: '#e8f4fd', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px' }}>
              Morning and evening slots typically have higher demand. Set higher prices for these peak hours.
            </div>
            
            <div className="form-row">
              <div className="form-field">
                <label>Morning Peak Start</label>
                <input 
                  type="time" 
                  value={formData.peak_morning_start} 
                  onChange={e => setFormData({...formData, peak_morning_start: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Morning Peak End</label>
                <input 
                  type="time" 
                  value={formData.peak_morning_end} 
                  onChange={e => setFormData({...formData, peak_morning_end: e.target.value})} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Evening Peak Start</label>
                <input 
                  type="time" 
                  value={formData.peak_evening_start} 
                  onChange={e => setFormData({...formData, peak_evening_start: e.target.value})} 
                />
              </div>
              <div className="form-field">
                <label>Evening Peak End</label>
                <input 
                  type="time" 
                  value={formData.peak_evening_end} 
                  onChange={e => setFormData({...formData, peak_evening_end: e.target.value})} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Peak Hour Multiplier</label>
                <input 
                  type="number" 
                  step="0.05" 
                  min="1.00" 
                  max="2.00" 
                  value={formData.peak_price_multiplier} 
                  onChange={e => setFormData({...formData, peak_price_multiplier: parseFloat(e.target.value)})} 
                />
                <small>e.g., 1.30 = 30% higher price</small>
              </div>
              <div className="form-field">
                <label>Off-Peak Multiplier</label>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0.50" 
                  max="1.00" 
                  value={formData.off_peak_price_multiplier} 
                  onChange={e => setFormData({...formData, off_peak_price_multiplier: parseFloat(e.target.value)})} 
                />
                <small>e.g., 0.90 = 10% discount</small>
              </div>
            </div>
          </div>

          <div className="form-info" style={{ background: '#f0f8ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Pricing Preview</h4>
            <p><strong>Peak Hour Price:</strong> Rs. {peakPrice.toFixed(2)} ({Math.round(formData.peak_price_multiplier * 100)}% of base price)</p>
            <p><strong>Off-Peak Price:</strong> Rs. {offPeakPrice.toFixed(2)} ({Math.round(formData.off_peak_price_multiplier * 100)}% of base price)</p>
            <p><strong>Total Slots Per Day:</strong> {calculateSlots()}</p>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
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

export default SettingsModal;