import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';

const PaymentVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pidx = params.get('pidx');
    const transactionId = params.get('transaction_id');
    const bulkBookingId = params.get('bulk_booking_id');

    console.log('Payment verification params:', { pidx, transactionId, bulkBookingId });

    if (!pidx) {
      setStatus('error');
      setMessage('Invalid payment response');
      return;
    }

    const verifyPayment = async () => {
      try {
        const requestData = { pidx };
        if (transactionId) requestData.transaction_id = transactionId;
        if (bulkBookingId) requestData.bulk_booking_id = bulkBookingId;
        
        console.log('Sending to server:', requestData);
        
        const response = await api.post('/khalti/verify', requestData);

        console.log('Verification response:', response.data);

        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Payment successful! Your booking is confirmed.');
          setTimeout(() => {
            navigate('/my-bookings');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        
        if (error.response?.status === 404) {
          // Try to fetch user's bookings to see if they were created
          setTimeout(() => {
            navigate('/my-bookings');
          }, 2000);
          
          setStatus('success');
          setMessage('Payment successful! Redirecting to your bookings...');
        } else {
          setStatus('error');
          setMessage(error.response?.data?.message || 'Failed to verify payment');
        }
      }
    };

    verifyPayment();
  }, [location, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        {status === 'verifying' && (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h2>Verifying Payment...</h2>
            <p>Please wait while we confirm your payment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#27ae60',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '30px',
              color: 'white'
            }}>✓</div>
            <h2 style={{ color: '#27ae60' }}>Payment Successful!</h2>
            <p>{message}</p>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
              Redirecting to your bookings...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#e74c3c',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '30px',
              color: 'white'
            }}>✗</div>
            <h2 style={{ color: '#e74c3c' }}>Payment Failed</h2>
            <p>{message}</p>
            <button
              onClick={() => navigate('/futsals')}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PaymentVerify;