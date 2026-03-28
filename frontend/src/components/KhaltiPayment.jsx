import React, { useState } from 'react';
import api from '../api/axios';

const KhaltiPayment = ({ bookingId, amount, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);

  const initiatePayment = async () => {
    setLoading(true);
    try {
      const response = await api.post('/khalti/initiate', {
        booking_id: bookingId,
        amount: amount,
      });

      if (response.data.success) {
        // Redirect to Khalti payment page
        window.location.href = response.data.payment_url;
      } else {
        onError?.(response.data.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      onError?.(error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={initiatePayment} 
      disabled={loading}
      className="khalti-btn"
      style={{
        background: '#5C2D91',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        opacity: loading ? 0.7 : 1
      }}
    >
      {loading ? (
        <>
          <span className="spinner"></span>
          Processing...
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>
          </svg>
          Pay with Khalti
        </>
      )}
    </button>
  );
};

export default KhaltiPayment;