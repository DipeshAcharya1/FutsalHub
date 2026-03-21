import React from "react";

const FutsalModal = ({ editingFutsal, futsalForm, setFutsalForm, admins, onSave, onClose, loading }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editingFutsal ? "Edit Futsal" : "Add New Futsal"}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={onSave}>
          <div className="form-group">
            <label>Futsal Name *</label>
            <input
              type="text"
              value={futsalForm.name}
              onChange={(e) => setFutsalForm({ ...futsalForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input
              type="text"
              value={futsalForm.location}
              onChange={(e) => setFutsalForm({ ...futsalForm, location: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="text"
              value={futsalForm.contact_number}
              onChange={(e) => setFutsalForm({ ...futsalForm, contact_number: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={futsalForm.description}
              onChange={(e) => setFutsalForm({ ...futsalForm, description: e.target.value })}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Assign Manager (optional)</label>
            <select
              value={futsalForm.manager_id}
              onChange={(e) => setFutsalForm({ ...futsalForm, manager_id: e.target.value })}
            >
              <option value="">-- No manager --</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} - {admin.email}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : editingFutsal ? "Update Futsal" : "Create Futsal"}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FutsalModal;