import api from '../../../api';

export const fetchBalance = async () => {
    const { data } = await api.get('/api/deposits/balance');
    return data;
};

export const fetchTransactions = async () => {
    const { data } = await api.get('/api/deposits/history');
    return data;
};

export const initiateDeposit = async (amount, phone) => {
    const { data } = await api.post('/api/payments/mpesa/stk-push', { 
        amount, 
        phoneNumber: phone,
        type: 'DEPOSIT' 
    });
    return data;
};

export const downloadStatement = async () => {
    const response = await api.get('/api/reports/statement/me', {
        responseType: 'blob', // Important for PDF
    });
    // Create a link to download the blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'My_Statement.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
};