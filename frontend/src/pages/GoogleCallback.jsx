import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    const error = params.get('error');

    console.log('Google callback - Full URL:', window.location.href);
    console.log('Google callback - Token:', token);
    console.log('Google callback - User String:', userStr);
    console.log('Google callback - Error:', error);

    if (error) {
      console.error('Google auth error from server:', error);
      navigate('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        console.log('Google user parsed:', user);
        
        // Store user data
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Determine redirect based on role
        if (user.role === 'super-admin') {
          navigate('/super-admin');
        } else if (user.role === 'admin' && user.futsal_id) {
          navigate(`/admin/${user.futsal_id}`);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login?error=authentication_failed');
      }
    } else {
      console.error('Missing token or user data');
      navigate('/login?error=missing_data');
    }
  }, [location, navigate]);

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '50px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }}></div>
      <h2>Processing your Google account...</h2>
      <p>Please wait while we redirect you.</p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default GoogleCallback;