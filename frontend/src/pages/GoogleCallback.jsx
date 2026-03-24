import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userStr = params.get('user');

    console.log('Google callback - token:', token);
    console.log('Google callback - user:', userStr);

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
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
      navigate('/login?error=no_token');
    }
  }, [location, navigate]);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>Logging you in...</h2>
      <p>Please wait.</p>
    </div>
  );
};

export default GoogleCallback;