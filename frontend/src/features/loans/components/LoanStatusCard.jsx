import React from 'react';
import { CreditCard, AlertCircle, CheckCircle, Lock, Clock, Calendar } from 'lucide-react';

export default function LoanStatusCard({ loan, onApply }) {
    // 1. Handle No Active Application (Show Eligibility)
    if (!loan || loan.status === 'NO_APP') {
        const isEligible = loan?.eligibility?.eligible;
        const message = loan?.eligibility?.message || "Check your savings balance.";

        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                    {isEligible ? <CreditCard size={32} /> : <Lock size={32} className="text-amber-500"/>}
                </div>
                <h3 className="text-lg font-bold text-slate-800">Apply for Loan</h3>
                
                {/* Eligibility Message */}
                <div className={`text-sm mb-6 px-4 py-2 rounded-lg inline-block ${isEligible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {message}
                </div>

                <button 
                    onClick={onApply} 
                    disabled={!isEligible}
                    className={`px-6 py-2 rounded-xl font-bold transition w-full ${isEligible ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                    {isEligible ? 'Start Application' : 'Not Eligible Yet'}
                </button>
            </div>
        );
    }

    // 2. Handle Active/Pending Application
    const isActive = loan.status === 'ACTIVE';
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-4 ${isActive ? 'text-emerald-500' : 'text-amber-500'} opacity-10`}>
                <CreditCard size={100} />
            </div>
            
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loan Status</p>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold mt-1 ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isActive ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                        {loan.status.replace('_', ' ')}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Balance</p>
                    <p className="text-2xl font-bold text-slate-800">KES {(parseFloat(loan.total_due) - parseFloat(loan.amount_repaid)).toLocaleString()}</p>
                </div>
            </div>

            {/* Weekly Schedule Display */}
            {isActive && loan.schedule && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">Progress</span>
                        <span className="font-bold text-slate-700">{Math.round((loan.amount_repaid / loan.total_due) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(loan.amount_repaid / loan.total_due) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-4 text-xs bg-slate-50 p-2 rounded-lg">
                        <div className="text-slate-500">Weekly Due: <span className="font-bold text-slate-800">KES {loan.schedule.weekly_installment?.toLocaleString()}</span></div>
                        <div className={`font-bold uppercase ${loan.schedule.status_text === 'IN ARREARS' ? 'text-red-500' : 'text-emerald-500'}`}>{loan.schedule.status_text}</div>
                    </div>

                    {/* ✅ NEW: Grace Period Countdown Widget */}
                    {loan.schedule.status_text === 'GRACE PERIOD' && (
                        <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-100 animate-pulse">
                            <Clock size={16} />
                            <span>{loan.schedule.grace_days_remaining} days left in grace period</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}