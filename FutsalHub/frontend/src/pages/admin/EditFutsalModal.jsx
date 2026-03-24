import React from "react";

const EditFutsalModal = ({ 
  futsalForm, setFutsalForm, imagePreview, onImageChange, onDeleteImage, onSubmit, onClose, loading, uploadingImage 
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '600px' }}>
        <div className="modal-head">
          <h3>Edit Futsal Information</h3>
          <button className="modal-close-btn" onClick={onClose}>X</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label className="form-label">Futsal Image</label>
            <div style={{ marginBottom: '10px' }}>
              {imagePreview && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview"
                    style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '4px' }}
                  />
                  <button 
                    type="button"
                    onClick={onDeleteImage}
                    style={{
                      position: 'absolute', top: '5px', right: '5px',
                      background: 'red', color: 'white', border: 'none',
                      borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={onImageChange} className="form-input" />
            <small>Accepted formats: JPEG, PNG, JPG, GIF (Max 2MB)</small>
          </div>

          <div className="form-field">
            <label className="form-label">Futsal Name</label>
            <input
              className="form-input"
              type="text"
              value={futsalForm.futsal_name}
              onChange={e => setFutsalForm({ ...futsalForm, futsal_name: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Location</label>
            <input
              className="form-input"
              type="text"
              value={futsalForm.location}
              onChange={e => setFutsalForm({ ...futsalForm, location: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Contact Number</label>
            <input
              className="form-input"
              type="text"
              value={futsalForm.contact_number}
              onChange={e => setFutsalForm({ ...futsalForm, contact_number: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows="4"
              value={futsalForm.description}
              onChange={e => setFutsalForm({ ...futsalForm, description: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading || uploadingImage}>
              {loading || uploadingImage ? "Saving..." : "Save Changes"}
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

export default EditFutsalModal;