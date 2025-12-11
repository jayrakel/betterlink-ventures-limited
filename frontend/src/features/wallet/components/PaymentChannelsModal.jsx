import React, { useState, useEffect } from 'react';
import { X, Building, Smartphone, Globe } from 'lucide-react';
import api from '../../../api';

export default function PaymentChannelsModal({ isOpen, onClose }) {
    const [channels, setChannels] = useState([]);

    useEffect(() => {
        if (isOpen) {
            api.get('/api/settings').then(res => {
                const setting = res.data.find(s => s.setting_key === 'payment_channels');
                if (setting) setChannels(JSON.parse(setting.setting_value));
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Deposit Accounts</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
                </div>
                <div className="p-6 space-y-4">
                    {channels.length === 0 && <p className="text-center text-slate-500">No payment accounts configured.</p>}
                    {channels.map((ch, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600">
                                {ch.type === 'MPESA' ? <Smartphone size={24}/> : ch.type === 'PAYPAL' ? <Globe size={24}/> : <Building size={24}/>}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{ch.name}</h4>
                                <p className="text-sm text-slate-600 font-mono bg-white px-2 py-0.5 rounded border inline-block mt-1">{ch.account}</p>
                                <p className="text-xs text-slate-400 mt-1">{ch.instructions}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}