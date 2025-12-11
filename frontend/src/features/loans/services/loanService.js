import api from '../../../api';

export const fetchLoanStatus = async () => {
    const { data } = await api.get('/api/loan/status');
    return data;
};

export const initApplication = async () => {
    const { data } = await api.post('/api/loan/init');
    return data;
};

export const submitApplication = async (data) => {
    const { data: result } = await api.post('/api/loan/submit', data);
    return result;
};

export const fetchGuarantorData = async () => {
    const [myGuarantors, requests] = await Promise.all([
        api.get('/api/loan/guarantors'),
        api.get('/api/loan/guarantors/requests')
    ]);
    return { myGuarantors: myGuarantors.data, requests: requests.data };
};

export const addGuarantor = async (loanId, guarantorId) => {
    await api.post('/api/loan/guarantors/add', { loanId, guarantorId });
};

export const respondToRequest = async (requestId, decision) => {
    await api.post('/api/loan/guarantors/respond', { requestId, decision });
};

export const searchMembers = async (query) => {
    const { data } = await api.get(`/api/loan/members/search?q=${query}`);
    return data;
};