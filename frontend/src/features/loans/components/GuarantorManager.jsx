import React, { useState, useEffect } from 'react';
import { Users, Search, Check, X } from 'lucide-react';
import { fetchGuarantorData, searchMembers, addGuarantor, respondToRequest } from '../services/loanService';

export default function GuarantorManager({ loanId }) {
    const [data, setData] = useState({ myGuarantors: [], requests: [] });
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);

    const refresh = async () => {
        const res = await fetchGuarantorData();
        setData(res);
    };

    useEffect(() => { refresh(); }, []);

    const handleSearch = async (val) => {
        setSearch(val);
        if (val.length > 2) {
            const res = await searchMembers(val);
            setResults(res);
        } else setResults([]);
    };

    const handleAdd = async (guarantorId) => {
        await addGuarantor(loanId, guarantorId);
        setSearch(''); setResults([]); refresh();
    };

    const handleRespond = async (reqId, decision) => {
        await respondToRequest(reqId, decision);
        refresh();
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={20} className="text-indigo-600"/> Guarantor Management</h3>
            
            {/* Search */}
            <div className="relative mb-6">
                <input type="text" placeholder="Search member to add..." className="w-full pl-10 p-3 border rounded-xl bg-slate-50" value={search} onChange={e => handleSearch(e.target.value)} />
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                {results.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-xl border mt-1 z-10 p-2">
                        {results.map(m => (
                            <div key={m.id} onClick={() => handleAdd(m.id)} className="p-3 hover:bg-indigo-50 cursor-pointer rounded-lg flex justify-between">
                                <span className="font-bold text-slate-700">{m.full_name}</span>
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Add</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* My Guarantors */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">My Guarantors</h4>
                    {data.myGuarantors.length === 0 && <p className="text-sm text-slate-400 italic">No guarantors added.</p>}
                    <div className="space-y-2">
                        {data.myGuarantors.map(g => (
                            <div key={g.id} className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-sm font-medium">{g.full_name}</span>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${g.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{g.status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Requests */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Incoming Requests</h4>
                    {data.requests.length === 0 && <p className="text-sm text-slate-400 italic">No pending requests.</p>}
                    <div className="space-y-2">
                        {data.requests.map(r => (
                            <div key={r.id} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-bold text-indigo-900">{r.applicant_name}</span>
                                    <span className="text-xs text-indigo-600">Loan: {parseFloat(r.amount_requested).toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRespond(r.id, 'ACCEPTED')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs py-1.5 rounded flex justify-center gap-1"><Check size={14}/> Accept</button>
                                    <button onClick={() => handleRespond(r.id, 'REJECTED')} className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs py-1.5 rounded flex justify-center gap-1"><X size={14}/> Decline</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}