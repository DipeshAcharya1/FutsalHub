import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const VerifyEmailNotice = () => {
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  const resendVerification = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    setMessage('');
    
    try {
      const response = await api.post('/resend-verification');
      setMessage(response.data.message);
      setCountdown(60);
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const response = await api.get('/verification-status');
        if (response.data.email_verified) {
          navigate('/home');
        }
      } catch (error) {
        console.error('Failed to check status:', error);
      }
    };

    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center', maxWidth: '450px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📧</div>
        <h2>Verify Your Email Address</h2>
        <p>We've sent a verification link to your email address.</p>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Please check your inbox and click the verification link to activate your account.
        </p>
        
        {message && (
          <div style={{
            padding: '10px',
            borderRadius: '6px',
            margin: '15px 0',
            background: message.includes('sent') ? '#d4edda' : '#f8d7da',
            color: message.includes('sent') ? '#155724' : '#721c24'
          }}>
            {message}
          </div>
        )}
        
        <button 
          onClick={resendVerification}
          disabled={resending || countdown > 0}
          style={{
            width: '100%',
            padding: '12px',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            marginTop: '10px',
            cursor: countdown > 0 ? 'not-allowed' : 'pointer',
            opacity: countdown > 0 ? 0.6 : 1
          }}
        >
          {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
        </button>
        
        <button 
          onClick={() => navigate('/login')}
          style={{
            width: '100%',
            padding: '12px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            marginTop: '10px',
            cursor: 'pointer'
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default VerifyEmailNotice;