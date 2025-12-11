import { useState, useEffect, useCallback } from 'react';
import { fetchBalance, fetchTransactions } from '../services/walletService';

export const useWallet = (userId) => {
    const [balance, setBalance] = useState({ savings: 0, shares: 0 });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refreshWallet = useCallback(() => setRefreshKey(k => k + 1), []);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        Promise.all([fetchBalance(), fetchTransactions()])
            .then(([bal, tx]) => {
                setBalance({ savings: bal.balance, shares: bal.shares });
                setTransactions(tx);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId, refreshKey]);

    return { balance, transactions, loading, refreshWallet };
};