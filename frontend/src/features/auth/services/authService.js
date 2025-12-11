import api from '../../../api';

export const loginUser = async (credentials) => {
    const { data } = await api.post('/api/auth/login', credentials);
    return data;
};

export const registerUser = async (userData) => {
    const { data } = await api.post('/api/auth/register', userData);
    return data;
};

export const logoutUser = async () => {
    try {
        await api.post('/api/auth/logout');
    } catch (error) {
        console.error("Logout failed", error);
    }
};

export const fetchUserProfile = async () => {
    const { data } = await api.get('/api/auth/profile');
    return data;
};

// ✅ MAKE SURE THIS IS HERE AND EXPORTED
export const changePassword = async (passwords) => {
    const { data } = await api.post('/api/auth/change-password', passwords);
    return data;
};