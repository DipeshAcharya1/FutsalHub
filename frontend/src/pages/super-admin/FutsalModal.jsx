import React, { useState, useEffect, useRef } from "react";

// Global script tracking for Google Maps
let googleMapsScriptLoaded = false;
let googleMapsScriptLoading = false;
const GOOGLE_MAPS_API_KEY = 'AIzaSyAa8MjvvJQ6zcjVqIkZCpwGl9EJX0IYBA0';

const FutsalModal = ({ editingFutsal, futsalForm, setFutsalForm, admins, onSave, onClose, loading }) => {
  const [imagePreview, setImagePreview] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Load Google Maps once
  useEffect(() => {
    if (!window.google && !googleMapsScriptLoading && !googleMapsScriptLoaded) {
      googleMapsScriptLoading = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        googleMapsScriptLoaded = true;
        googleMapsScriptLoading = false;
        setMapLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.google) {
      setMapLoaded(true);
    }
  }, []);

  // Handle image preview
  useEffect(() => {
    if (futsalForm.image && typeof futsalForm.image === 'string') {
      setImagePreview(futsalForm.image);
    } else if (futsalForm.image instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(futsalForm.image);
    } else {
      setImagePreview(null);
    }
  }, [futsalForm.image]);

  // Initialize map when coordinates are available
  useEffect(() => {
    if (mapLoaded && showMap && mapRef.current && futsalForm.latitude && futsalForm.longitude) {
      initMap();
    }
  }, [mapLoaded, showMap, futsalForm.latitude, futsalForm.longitude]);

  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }

    const center = { 
      lat: parseFloat(futsalForm.latitude), 
      lng: parseFloat(futsalForm.longitude) 
    };

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 15,
      center: center,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    // Clean up existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new window.google.maps.Marker({
      position: center,
      map: mapInstanceRef.current,
      draggable: true,
    });

    // Update coordinates when marker is dragged
    markerRef.current.addListener('dragend', () => {
      const position = markerRef.current.getPosition();
      setFutsalForm({ 
        ...futsalForm, 
        latitude: position.lat().toFixed(6), 
        longitude: position.lng().toFixed(6) 
      });
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFutsalForm({ ...futsalForm, image: file });
    }
  };

  const handleShowMap = () => {
    if (!futsalForm.latitude || !futsalForm.longitude) {
      alert('Please enter latitude and longitude first');
      return;
    }
    setShowMap(true);
    setTimeout(() => {
      if (mapRef.current && mapLoaded) {
        initMap();
      }
    }, 100);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>{editingFutsal ? "Edit Futsal" : "Add New Futsal"}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={onSave}>
          {/* Image Upload */}
          <div className="form-group">
            <label>Futsal Image</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
              <div style={{ marginTop: '10px' }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} 
                />
              </div>
            )}
            {editingFutsal?.image && !futsalForm.image && !imagePreview && (
              <div className="current-image">
                <small>Current image: </small>
                <img 
                  src={editingFutsal.image} 
                  alt="Current" 
                  style={{ width: '50px', height: '50px', objectFit: 'cover', marginTop: '5px', borderRadius: '4px' }} 
                />
              </div>
            )}
          </div>

          {/* Basic Info */}
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
            <label>Location (Address) *</label>
            <input
              type="text"
              value={futsalForm.location}
              onChange={(e) => setFutsalForm({ ...futsalForm, location: e.target.value })}
              required
            />
          </div>

          {/* Coordinates Section */}
          <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Latitude</label>
              <input
                type="text"
                value={futsalForm.latitude || ''}
                onChange={(e) => setFutsalForm({ ...futsalForm, latitude: e.target.value })}
                placeholder="e.g., 27.7172"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Longitude</label>
              <input
                type="text"
                value={futsalForm.longitude || ''}
                onChange={(e) => setFutsalForm({ ...futsalForm, longitude: e.target.value })}
                placeholder="e.g., 85.3240"
              />
            </div>
          </div>

          {/* Get Coordinates Help */}
          <div style={{ fontSize: '12px', marginBottom: '15px' }}>
            <a 
              href="https://www.google.com/maps" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#3498db' }}
            >
              📍 Get coordinates from Google Maps
            </a>
            <small style={{ display: 'block', color: '#666', marginTop: '5px' }}>
              How to get coordinates: Right-click on the location in Google Maps → Click on the coordinates
            </small>
          </div>

          {/* Show Map Button */}
          {futsalForm.latitude && futsalForm.longitude && !showMap && (
            <button
              type="button"
              onClick={handleShowMap}
              style={{
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '15px',
                fontSize: '13px'
              }}
            >
              🗺️ Show Location on Map
            </button>
          )}

          {/* Map Preview */}
          {showMap && futsalForm.latitude && futsalForm.longitude && (
            <div className="form-group">
              <label>Map Preview (Drag marker to adjust)</label>
              <div 
                ref={mapRef} 
                style={{ 
                  width: '100%', 
                  height: '300px', 
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f8f9fa'
                }} 
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowMap(false)}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Hide Map
                </button>
                <small style={{ color: '#666', lineHeight: '32px' }}>
                  Drag the marker to exact location
                </small>
              </div>
            </div>
          )}

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
            <label>Assign Manager</label>
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