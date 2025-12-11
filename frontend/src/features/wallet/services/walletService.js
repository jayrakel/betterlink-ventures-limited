import api from '../../../api';

export const fetchBalance = async () => {
    const { data } = await api.get('/api/deposits/balance');
    return data;
};

export const fetchTransactions = async () => {
    const { data } = await api.get('/api/deposits/history');
    return data;
};

// Handle M-Pesa STK Push
export const initiateDeposit = async (amount, phone, type) => {
    const { data } = await api.post('/api/payments/mpesa/stk-push', { 
        amount, 
        phoneNumber: phone,
        type // e.g. DEPOSIT, SHARE_CAPITAL
    });
    return data;
};

// ✅ NEW: Handle Manual Payments (Bank/PayPal/M-Pesa Manual)
export const recordManualPayment = async (payload) => {
    // payload = { amount, reference, type, method, bankName }
    // We map this to the backend's manual recording endpoint
    const { data } = await api.post('/api/payments/manual', payload);
    return data;
};

export const downloadStatement = async () => {
    const response = await api.get('/api/reports/statement/me', {
        responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'My_Statement.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
};