import React, { useState, useEffect, useRef } from "react";

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyAa8MjvvJQ6zcjVqIkZCpwGl9EJX0IYBA0';

// Track script loading globally to prevent multiple loads
let googleMapsScriptLoaded = false;
let googleMapsScriptLoading = false;

const EditFutsalModal = ({ 
  futsalForm, setFutsalForm, imagePreview, onImageChange, onDeleteImage, onSubmit, onClose, loading, uploadingImage 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Load Google Maps - SINGLE LOAD
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;

    // Check if already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Check if already loading
    if (googleMapsScriptLoading) return;

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
    script.onerror = () => {
      googleMapsScriptLoading = false;
      console.error('Failed to load Google Maps');
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount
    };
  }, []);

  // Initialize map when coordinates are available
  useEffect(() => {
    if (mapLoaded && showMap && mapRef.current && futsalForm.latitude && futsalForm.longitude) {
      initMap();
    }
  }, [mapLoaded, showMap, futsalForm.latitude, futsalForm.longitude]);

  const initMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

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

  const handleShowMap = () => {
    if (!futsalForm.latitude || !futsalForm.longitude) {
      alert('Please enter latitude and longitude first');
      return;
    }
    setShowMap(true);
    setTimeout(() => {
      if (mapRef.current && mapLoaded && window.google && window.google.maps) {
        initMap();
      }
    }, 100);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '700px' }}>
        <div className="modal-head">
          <h3>Edit Futsal Information</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Image Section */}
          <div className="form-field">
            <label className="form-label">Futsal Image</label>
            <div style={{ marginBottom: '10px' }}>
              {imagePreview && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview"
                    style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '4px', objectFit: 'cover' }}
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

          {/* Basic Info */}
          <div className="form-field">
            <label className="form-label">Futsal Name</label>
            <input
              className="form-input"
              type="text"
              value={futsalForm.futsal_name || ''}
              onChange={e => setFutsalForm({ ...futsalForm, futsal_name: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Location (Address)</label>
            <input
              className="form-input"
              type="text"
              value={futsalForm.location || ''}
              onChange={e => setFutsalForm({ ...futsalForm, location: e.target.value })}
              required
            />
          </div>

          {/* Coordinates Section */}
          <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">Latitude</label>
              <input
                className="form-input"
                type="text"
                value={futsalForm.latitude || ''}
                onChange={(e) => setFutsalForm({ ...futsalForm, latitude: e.target.value })}
                placeholder="e.g., 27.7172"
              />
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">Longitude</label>
              <input
                className="form-input"
                type="text"
                value={futsalForm.longitude || ''}
                onChange={(e) => setFutsalForm({ ...futsalForm, longitude: e.target.value })}
                placeholder="e.g., 85.3240"
              />
            </div>
          </div>

          {/* How to get coordinates link */}
          <div style={{ marginBottom: '15px', fontSize: '12px' }}>
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
            <div className="form-field">
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
                  fontSize: '13px'
                }}
              >
                🗺️ Show Location on Map
              </button>
            </div>
          )}

          {/* Map Preview */}
          {showMap && futsalForm.latitude && futsalForm.longitude && (
            <div className="form-field">
              <label className="form-label">Map Preview (Drag marker to adjust)</label>
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

          {/* Contact Number */}
          <div className="form-field">
            <label className="form-label">Contact Number</label>
            <input
              className="form-input"
              type="text"
              value={futsalForm.contact_number || ''}
              onChange={e => setFutsalForm({ ...futsalForm, contact_number: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows="4"
              value={futsalForm.description || ''}
              onChange={e => setFutsalForm({ ...futsalForm, description: e.target.value })}
            />
          </div>

          {/* Form Actions */}
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