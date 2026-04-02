import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { id, token } = useParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    try {
      const response = await api.get(`/verify-email/${id}/${token}`);
      setStatus('success');
      setMessage(response.data.message);
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center', maxWidth: '450px' }}>
        {status === 'verifying' && (
          <>
            <div className="spinner"></div>
            <h2>Verifying your email...</h2>
            <p>Please wait while we verify your email address.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div style={{ fontSize: '64px', color: '#28a745', marginBottom: '20px' }}>✓</div>
            <h2>Email Verified!</h2>
            <p>{message}</p>
            <p>Redirecting to login page...</p>
            <button 
              onClick={() => navigate('/login')}
              style={{
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                marginTop: '15px',
                cursor: 'pointer'
              }}
            >
              Go to Login Now
            </button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div style={{ fontSize: '64px', color: '#dc3545', marginBottom: '20px' }}>⚠️</div>
            <h2>Verification </h2>
            <p>{message}</p>
            <button 
              onClick={() => navigate('/login')}
              style={{
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                marginRight: '10px',
                cursor: 'pointer'
              }}
            >
              Go to Login
            </button>
            <button 
              onClick={() => navigate('/register')}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Create New Account
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;