import React, { useState } from "react";

const GenerateModal = ({ settings, onGenerate, onClose, loading }) => {
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [customPrice, setCustomPrice] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate(slotDate, customPrice || null);
  };

  const getPreviewSlots = () => {
    const start = settings.open_time.split(':').map(Number);
    const slots = [];
    let currentHour = start[0];
    let currentMin = start[1];
    
    for (let i = 0; i < 3; i++) {
      const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      let endMin = currentMin + settings.slot_duration;
      let endHour = currentHour;
      if (endMin >= 60) {
        endHour += Math.floor(endMin / 60);
        endMin = endMin % 60;
      }
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      slots.push(`${startTime} - ${endTime}`);
      
      currentMin += settings.slot_duration + settings.break_time;
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
    return slots;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-head">
          <h3>Generate Time Slots</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Select Date</label>
            <input type="date" value={slotDate} 
              onChange={(e) => setSlotDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} required />
          </div>

          <div className="form-field">
            <label>Price (Optional)</label>
            <input type="number" value={customPrice} 
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder={`Default: Rs. ${settings.default_price}`} />
          </div>

          <div className="form-info">
            <h4>Preview Slots</h4>
            <ul>
              {getPreviewSlots().map((slot, i) => <li key={i}>{slot}</li>)}
              <li>...</li>
            </ul>
            <p><strong>Total slots per day: {Math.floor(((settings.close_time.split(':')[0]*60 + settings.close_time.split(':')[1]) - 
              (settings.open_time.split(':')[0]*60 + settings.open_time.split(':')[1])) / 
              (settings.slot_duration + settings.break_time))}</strong></p>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? "Generating..." : "Generate Slots"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateModal;