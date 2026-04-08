import React, { useEffect, useRef } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAa8MjvvJQ6zcjVqIkZCpwGl9EJX0IYBA0';

// Track if script is already loaded
let scriptLoaded = false;

const MapComponent = ({ location, latitude, longitude, futsalName }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    console.log('MapComponent - Location:', location);
    console.log('MapComponent - Coordinates:', latitude, longitude);

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ Google Maps API key is missing!');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    // Only load script if not already loaded
    if (!scriptLoaded) {
      scriptLoaded = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('✅ Google Maps script loaded');
      };
      script.onerror = () => console.error('❌ Failed to load Google Maps script');
      document.head.appendChild(script);
    } else {
      // Script already loading or loaded, wait for it
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogle);
          initMap();
        }
      }, 100);
    }

    window.initMap = initMap;
  }, [location, latitude, longitude]);

  const initMap = () => {
    if (!mapRef.current) {
      console.error('❌ Map container not found');
      return;
    }

    if (!window.google) {
      console.error('❌ Google Maps not loaded');
      return;
    }

    // Check if we have coordinates
    if (latitude && longitude) {
      const center = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
      console.log('Creating map with coordinates:', center);
      createMap(center);
    } 
    else if (location) {
      console.log('Geocoding address:', location);
      geocodeAddress(location);
    }
    else {
      console.log('No location or coordinates provided');
      if (mapRef.current) {
        mapRef.current.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">📍 Location not available</div>';
      }
    }
  };

  const createMap = (center) => {
    if (!mapRef.current || !window.google) return;

    // Clean up existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 15,
      center: center,
    });

    // Use AdvancedMarkerElement to avoid deprecation warning (optional)
    new window.google.maps.Marker({
      position: center,
      map: mapInstanceRef.current,
      title: futsalName || 'Futsal Location',
    });
    
    console.log('✅ Map created successfully');
  };

  const geocodeAddress = (address) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        console.log('✅ Geocoding success:', location.lat(), location.lng());
        createMap({ lat: location.lat(), lng: location.lng() });
      } else {
        console.error('❌ Geocoding failed:', status);
        
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; padding: 20px; text-align: center;">
              <p style="margin-bottom: 10px;">📍 Could not find location: ${address}</p>
              <p style="font-size: 12px; color: #666;">Please check the address or add coordinates manually.</p>
            </div>
          `;
        }
        
        createMap({ lat: 27.7172, lng: 85.3240 });
      }
    });
  };

  return (
    <div className="map-container">
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '300px', 
          borderRadius: '12px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #eef2f6'
        }} 
      />
      {location && !latitude && !longitude && (
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
          📍 {location} (approximate location)
        </div>
      )}
    </div>
  );
};

export default MapComponent;