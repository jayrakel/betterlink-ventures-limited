import React, { useState, useEffect } from 'react';
import { ThumbsUp, Check, Loader2 } from 'lucide-react';
import api from '../../../api';

export default function VotingQueue() {
    const [votes, setVotes] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchVotes = async () => {
        try {
            const { data } = await api.get("/api/loan/vote/open");
            setVotes(data);
        } catch (err) {
            console.error("Failed to fetch votes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVotes(); }, []);

    const handleVote = async (loanId) => {
        try {
            await api.post("/api/loan/vote", { loanId, decision: 'YES' });
            alert("Vote Cast Successfully!");
            fetchVotes(); // Refresh list
        } catch (err) {
            alert("Failed to cast vote.");
        }
    };

    if (loading) return null;
    if (votes.length === 0) return null; // Don't show if empty

    return (
        <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100 mb-6">
            <h3 className="font-bold text-purple-900 flex items-center gap-2 mb-4">
                <ThumbsUp size={20} /> Voting Queue
            </h3>
            <div className="space-y-3">
                {votes.map(vote => (
                    <div key={vote.id} className="bg-white p-3 rounded-xl border border-purple-100 flex justify-between items-center shadow-sm">
                        <div>
                            <p className="font-bold text-slate-700">{vote.full_name}</p>
                            <p className="text-xs text-slate-500">Request: KES {parseFloat(vote.amount_requested).toLocaleString()}</p>
                        </div>
                        <button 
                            onClick={() => handleVote(vote.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        >
                            <Check size={14} /> Approve
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}