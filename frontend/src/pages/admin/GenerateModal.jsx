import React, { useState } from "react";

const GenerateModal = ({ settings, onGenerate, onClose, loading }) => {
  const [generationType, setGenerationType] = useState("single");
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState("");
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4, 5, 6]);

  const daysOfWeek = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
  ];

  const toggleDay = (dayValue) => {
    if (selectedDays.includes(dayValue)) {
      setSelectedDays(selectedDays.filter(d => d !== dayValue));
    } else {
      setSelectedDays([...selectedDays, dayValue]);
    }
  };

  const getSlotsPreview = () => {
    if (!settings) return 0;
    const start = settings.open_time.split(':').map(Number);
    const end = settings.close_time.split(':').map(Number);
    const totalMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
    const slotCycle = settings.slot_duration + settings.break_time;
    return Math.floor(totalMinutes / slotCycle);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (generationType === "single") {
      onGenerate(slotDate, price || null, false);
    } else {
      onGenerate(null, price || null, true, startDate, endDate, selectedDays);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-lg">
        <div className="modal-head">
          <h3> Generate Time Slots</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h4>Generation Type</h4>
            <div className="radio-group">
              <label className="radio-label">
                <input type="radio" value="single" checked={generationType === "single"} 
                  onChange={(e) => setGenerationType(e.target.value)} />
                Single Date
              </label>
              <label className="radio-label">
                <input type="radio" value="bulk" checked={generationType === "bulk"} 
                  onChange={(e) => setGenerationType(e.target.value)} />
                Date Range
              </label>
            </div>
          </div>

          {generationType === "single" ? (
            <div className="form-field">
              <label>Select Date</label>
              <input type="date" value={slotDate} 
                onChange={(e) => setSlotDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} required />
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-field">
                  <label>Start Date</label>
                  <input type="date" value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="form-field">
                  <label>End Date</label>
                  <input type="date" value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate} required />
                </div>
              </div>

              <div className="form-field">
                <label>Days of Week (optional)</label>
                <div className="days-checkbox-group">
                  {daysOfWeek.map(day => (
                    <label key={day.value} className="day-checkbox">
                      <input type="checkbox" checked={selectedDays.includes(day.value)} 
                        onChange={() => toggleDay(day.value)} />
                      {day.label}
                    </label>
                  ))}
                </div>
                <small>Leave all selected to generate for all days</small>
              </div>
            </>
          )}

          <div className="form-field">
            <label>Price (Optional)</label>
            <input type="number" value={price} 
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`Default: Rs. ${settings?.default_price || 1500}`} />
            <small>Leave empty to use default price</small>
          </div>

          {settings && (
            <div className="form-info">
              <h4>Preview</h4>
              <ul>
                <li>Operating Hours: {settings.open_time} - {settings.close_time}</li>
                <li>Slot: {settings.slot_duration} min play </li>
              </ul>
            </div>
          )}

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