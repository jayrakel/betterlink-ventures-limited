import { useState, useEffect, useCallback } from 'react';
import { fetchBalance, fetchTransactions } from '../services/walletService';
import api from '../../../api'; // Import api to fetch settings

export const useWallet = (userId) => {
    const [balance, setBalance] = useState({ savings: 0, shares: 0 });
    const [transactions, setTransactions] = useState([]);
    const [weeklyStats, setWeeklyStats] = useState({ total: 0, goal: 250, isComplete: false });
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refreshWallet = useCallback(() => setRefreshKey(k => k + 1), []);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);

        const loadData = async () => {
            try {
                // 1. Fetch Data
                const [bal, tx, settings] = await Promise.all([
                    fetchBalance(),
                    fetchTransactions(),
                    api.get('/api/settings')
                ]);

                // 2. Set Balance & History
                setBalance({ savings: parseFloat(bal.balance), shares: parseFloat(bal.shares) });
                setTransactions(tx);

                // 3. Calculate Weekly Stats
                const minWeekly = settings.data.find(s => s.setting_key === 'min_weekly_deposit')?.setting_value || 250;
                
                const now = new Date();
                const day = now.getDay() || 7; // 1 (Mon) - 7 (Sun)
                const startOfWeek = new Date(now);
                startOfWeek.setHours(-24 * (day - 1)); // Go back to Monday
                startOfWeek.setHours(0, 0, 0, 0);

                const weekTotal = tx
                    .filter(t => t.type === 'DEPOSIT' && new Date(t.created_at) >= startOfWeek)
                    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

                setWeeklyStats({
                    total: weekTotal,
                    goal: parseFloat(minWeekly),
                    isComplete: weekTotal >= parseFloat(minWeekly)
                });

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userId, refreshKey]);

    return { balance, transactions, weeklyStats, loading, refreshWallet };
};