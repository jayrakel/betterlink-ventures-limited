import { useState, useEffect, useCallback } from 'react';
import { fetchLoanStatus } from '../services/loanService';

export const useLoans = (userId) => {
    const [loan, setLoan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refreshLoans = useCallback(() => setRefreshKey(k => k + 1), []);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        fetchLoanStatus()
            .then(setLoan)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId, refreshKey]);

    return { loan, loading, refreshLoans };
};