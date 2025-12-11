import React, { useState, useEffect } from 'react';
import { ThumbsUp, Check } from 'lucide-react';
import api from '../../../api';

export default function VotingQueue() {
    const [votes, setVotes] = useState([]);

    const fetchVotes = async () => {
        try { const { data } = await api.get("/api/loan/vote/open"); setVotes(data); } catch (e) {}
    };
    useEffect(() => { fetchVotes(); }, []);

    const handleVote = async (loanId) => {
        try { await api.post("/api/loan/vote", { loanId, decision: 'YES' }); fetchVotes(); } catch (e) {}
    };

    if (votes.length === 0) return null;

    return (
        <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
            <h3 className="font-bold text-purple-900 flex items-center gap-2 mb-3"><ThumbsUp size={20}/> Voting Queue</h3>
            <div className="space-y-2">
                {votes.map(v => (
                    <div key={v.id} className="bg-white p-3 rounded-lg flex justify-between items-center shadow-sm">
                        <span className="text-sm font-bold text-slate-700">{v.full_name} <span className="font-normal text-slate-500">needs KES {parseFloat(v.amount_requested).toLocaleString()}</span></span>
                        <button onClick={() => handleVote(v.id)} className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-purple-700 flex items-center gap-1"><Check size={12}/> Approve</button>
                    </div>
                ))}
            </div>
        </div>
    );
}