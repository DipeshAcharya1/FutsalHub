import api from './axios';

export const getGoogleMapsKey = async () => {
    try {
        const response = await api.get('/config/google-maps-key');
        return response.data.key;
    } catch (error) {
        console.error('Failed to load Google Maps key:', error);
        return '';
    }
};