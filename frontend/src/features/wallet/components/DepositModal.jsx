import React, { useState, useEffect } from 'react';
import { 
    X, Loader2, Coins, CheckCircle, Smartphone, Landmark, Globe, 
    Copy, Info 
} from 'lucide-react';
import api from '../../../api';
import { initiateDeposit, recordManualPayment } from '../services/walletService';

export default function DepositModal({ isOpen, onClose, userPhone, activeLoan }) {
    const [amount, setAmount] = useState('');
    const [purpose, setPurpose] = useState('DEPOSIT');
    const [method, setMethod] = useState('MPESA'); // MPESA, BANK, PAYPAL
    
    // M-Pesa State
    const [phone, setPhone] = useState(userPhone || '');
    const [mpesaMode, setMpesaMode] = useState('STK'); // STK or MANUAL
    
    // Bank/Manual State
    const [reference, setReference] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    
    const [loading, setLoading] = useState(false);
    
    // Data from Settings
    const [settings, setSettings] = useState({});
    const [categories, setCategories] = useState([]);
    const [channels, setChannels] = useState([]);

    useEffect(() => {
        if (isOpen) {
            Promise.all([
                api.get('/api/settings'),
                api.get('/api/settings/categories')
            ]).then(([sets, cats]) => {
                const map = {};
                sets.data.forEach(s => map[s.setting_key] = s.setting_value);
                setSettings(map);
                
                // Parse Payment Channels
                try {
                    const chans = JSON.parse(map['payment_channels'] || '[]');
                    setChannels(chans);
                } catch(e) { setChannels([]); }

                setCategories(cats.data);
            });
        }
    }, [isOpen]);

    // Smart Auto-Fill Logic
    useEffect(() => {
        let fillAmount = "";
        if (purpose === 'WELFARE') fillAmount = settings['category_welfare_amount'];
        else if (purpose === 'PENALTY') fillAmount = settings['category_penalty_amount'];
        else if (purpose === 'SHARE_CAPITAL') fillAmount = settings['min_share_capital'];
        
        const customCat = categories.find(c => c.name === purpose);
        if (customCat && customCat.amount > 0) fillAmount = customCat.amount;

        if (purpose === 'LOAN_REPAYMENT' && activeLoan?.status === 'ACTIVE') {
            fillAmount = Math.ceil(activeLoan.schedule?.weekly_installment || 0);
        }

        if (fillAmount) setAmount(fillAmount.toString());
        else setAmount('');
    }, [purpose, settings, categories, activeLoan]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (method === 'MPESA' && mpesaMode === 'STK') {
                await initiateDeposit(amount, phone, purpose);
                alert('STK Push sent! Check your phone.');
                onClose();
            } else {
                // Manual Recording (Bank, PayPal, or M-Pesa Manual)
                await recordManualPayment({
                    amount,
                    reference,
                    type: purpose,
                    method, // BANK, PAYPAL, MPESA
                    bankName: selectedBank || 'Manual'
                });
                alert('Payment recorded! Waiting for verification.');
                onClose();
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to process payment.');
        } finally {
            setLoading(false);
        }
    };

    // Filter Channels based on Method
    const activeChannels = channels.filter(c => c.type === method);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Coins className="text-emerald-600"/> Make Payment
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                    
                    {/* 1. Payment Type */}
                    <div className="mb-5">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Payment Category</label>
                        <select 
                            className="w-full border border-slate-300 p-3 rounded-xl bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    </div>

                    {/* 2. Method Tabs */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {['MPESA', 'BANK', 'PAYPAL'].map(m => (
                            <button key={m} type="button" onClick={() => { setMethod(m); setSelectedBank(''); }} className={`p-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 transition ${method === m ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                {m === 'MPESA' && <Smartphone size={18}/>}
                                {m === 'BANK' && <Landmark size={18}/>}
                                {m === 'PAYPAL' && <Globe size={18}/>}
                                {m}
                            </button>
                        ))}
                    </div>

                    {/* 3. Method Specific Logic */}
                    
                    {/* --- BANK LOGIC --- */}
                    {method === 'BANK' && (
                        <div className="space-y-4 mb-4 animate-in slide-in-from-top-2">
                            {/* Bank List / Instructions */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1"><Info size={14}/> Available Bank Accounts</p>
                                {activeChannels.length === 0 ? (
                                    <p className="text-xs text-blue-600 italic">No bank accounts configured by Admin.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {activeChannels.map((bank, idx) => (
                                            <div key={idx} className="bg-white p-2 rounded border border-blue-100 text-xs shadow-sm">
                                                <div className="flex justify-between font-bold text-slate-700">
                                                    <span>{bank.name}</span>
                                                    <span className="font-mono">{bank.account}</span>
                                                </div>
                                                <p className="text-slate-500 mt-0.5">{bank.instructions}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bank Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Bank Paid To</label>
                                <select 
                                    required 
                                    className="w-full border p-3 rounded-xl bg-white"
                                    value={selectedBank} 
                                    onChange={e => setSelectedBank(e.target.value)}
                                >
                                    <option value="">-- Choose Bank --</option>
                                    {activeChannels.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* --- MPESA LOGIC --- */}
                    {method === 'MPESA' && (
                        <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
                            <button type="button" onClick={()=>setMpesaMode('STK')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${mpesaMode==='STK' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>Auto (STK)</button>
                            <button type="button" onClick={()=>setMpesaMode('MANUAL')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${mpesaMode==='MANUAL' ? 'bg-white shadow text-slate-700' : 'text-slate-500'}`}>Manual Code</button>
                        </div>
                    )}

                    {/* 4. Common Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                Amount (KES)
                                {amount && <span className="text-emerald-600 flex items-center gap-1 text-[10px] bg-emerald-50 px-2 rounded"><CheckCircle size={10}/> Auto-filled</span>}
                            </label>
                            <input 
                                type="number" required min="50"
                                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg font-bold text-slate-800"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        {/* M-Pesa Phone */}
                        {method === 'MPESA' && mpesaMode === 'STK' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">M-Pesa Number</label>
                                <input type="tel" required className="w-full p-3 rounded-xl border border-slate-300" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                        )}

                        {/* Reference Code (For Bank, PayPal, or Manual M-Pesa) */}
                        {((method === 'MPESA' && mpesaMode === 'MANUAL') || method === 'BANK' || method === 'PAYPAL') && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transaction Ref / Code</label>
                                <input 
                                    type="text" required 
                                    className="w-full p-3 rounded-xl border border-slate-300 font-mono uppercase"
                                    placeholder={method === 'BANK' ? "e.g. BT-239482" : "e.g. QWE123456"}
                                    value={reference} 
                                    onChange={(e) => setReference(e.target.value)} 
                                />
                            </div>
                        )}
                    </div>

                    <button disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 mt-6 shadow-lg">
                        {loading ? <Loader2 className="animate-spin" /> : (method === 'MPESA' && mpesaMode === 'STK' ? 'Send Request' : 'Submit Payment')}
                    </button>
                </form>
            </div>
        </div>
    );
}