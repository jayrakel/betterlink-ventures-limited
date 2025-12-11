import React, { useState, useEffect } from 'react';
import { X, Loader2, Coins, CheckCircle, Smartphone, Landmark, Globe } from 'lucide-react';
import api from '../../../api';
import { initiateDeposit } from '../services/walletService';

export default function DepositModal({ isOpen, onClose, userPhone, activeLoan }) {
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState(userPhone || '');
    const [purpose, setPurpose] = useState('DEPOSIT');
    const [method, setMethod] = useState('MPESA');
    const [loading, setLoading] = useState(false);
    
    // Auto-fill logic state
    const [settings, setSettings] = useState({});
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (isOpen) {
            // Fetch settings to get auto-fill amounts
            Promise.all([
                api.get('/api/settings'),
                api.get('/api/settings/categories')
            ]).then(([sets, cats]) => {
                const map = {};
                sets.data.forEach(s => map[s.setting_key] = s.setting_value);
                setSettings(map);
                setCategories(cats.data);
            });
        }
    }, [isOpen]);

    // Smart Auto-Fill Logic
    useEffect(() => {
        let fillAmount = "";
        
        // 1. Check System Settings
        if (purpose === 'WELFARE') fillAmount = settings['category_welfare_amount'];
        else if (purpose === 'PENALTY') fillAmount = settings['category_penalty_amount'];
        else if (purpose === 'SHARE_CAPITAL') fillAmount = settings['min_share_capital'];
        
        // 2. Check Custom Categories
        const customCat = categories.find(c => c.name === purpose);
        if (customCat && customCat.amount > 0) fillAmount = customCat.amount;

        // 3. Check Active Loan (Weekly Installment)
        if (purpose === 'LOAN_REPAYMENT' && activeLoan?.status === 'ACTIVE') {
            fillAmount = Math.ceil(activeLoan.schedule?.weekly_installment || 0);
        }

        if (fillAmount) setAmount(fillAmount.toString());
        else setAmount('');

    }, [purpose, settings, categories, activeLoan]);

    if (!isOpen) return null;

    const handleDeposit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (method === 'MPESA') {
                await initiateDeposit(amount, phone, purpose); // Pass purpose
                alert('STK Push sent! Check your phone.');
                onClose();
            } else {
                alert("Please use the Bank Info button to see account details for manual transfer.");
            }
        } catch (error) {
            alert('Failed to initiate payment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Make Payment</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
                </div>
                
                <form onSubmit={handleDeposit} className="p-6 space-y-5">
                    {/* Purpose Selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Payment Type</label>
                        <div className="relative">
                            <select 
                                className="w-full border p-3 pl-10 rounded-xl bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                            >
                                <option value="DEPOSIT">Savings Deposit</option>
                                <option value="SHARE_CAPITAL">Share Capital</option>
                                <option value="LOAN_REPAYMENT">Loan Repayment</option>
                                <option value="WELFARE">Welfare</option>
                                <option value="PENALTY">Penalty</option>
                                {categories.length > 0 && <optgroup label="Other">{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</optgroup>}
                            </select>
                            <Coins className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                        </div>
                    </div>

                    {/* Method Selector */}
                    <div className="grid grid-cols-3 gap-2">
                        {['MPESA', 'BANK', 'PAYPAL'].map(m => (
                            <button key={m} type="button" onClick={() => setMethod(m)} className={`p-2 rounded-lg text-xs font-bold border flex flex-col items-center gap-1 transition ${method === m ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                                {m === 'MPESA' && <Smartphone size={16}/>}
                                {m === 'BANK' && <Landmark size={16}/>}
                                {m === 'PAYPAL' && <Globe size={16}/>}
                                {m}
                            </button>
                        ))}
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between">
                            Amount (KES)
                            {amount && <span className="text-emerald-600 flex items-center gap-1 text-[10px] bg-emerald-50 px-2 rounded"><CheckCircle size={10}/> Auto-filled</span>}
                        </label>
                        <input 
                            type="number" required min="50"
                            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg font-bold text-slate-800"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    {/* Phone Input (Only for M-Pesa) */}
                    {method === 'MPESA' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">M-Pesa Number</label>
                            <input 
                                type="tel" required
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                    )}

                    <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                        {loading ? <Loader2 className="animate-spin" /> : 'Confirm Payment'}
                    </button>
                </form>
            </div>
        </div>
    );
}