import api from '../../../api'; // Ensure this points to your existing axios instance

export const loginUser = async (credentials) => {
    // credentials = { email, password }
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