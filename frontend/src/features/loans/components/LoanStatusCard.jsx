import React from 'react';
import { CreditCard, AlertCircle, CheckCircle, Lock, Clock, TrendingUp, TrendingDown } from 'lucide-react';

export default function LoanStatusCard({ loan, onApply }) {
    // 1. NO ACTIVE LOAN VIEW
    if (!loan || loan.status === 'NO_APP') {
        const isEligible = loan?.eligibility?.eligible;
        const message = loan?.eligibility?.message || "Check your savings balance.";

        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                    {isEligible ? <CreditCard size={32} /> : <Lock size={32} className="text-amber-500"/>}
                </div>
                <h3 className="text-lg font-bold text-slate-800">Apply for Loan</h3>
                <div className={`text-sm mb-6 px-4 py-2 rounded-lg inline-block ${isEligible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {message}
                </div>
                <button onClick={onApply} disabled={!isEligible} className={`px-6 py-2 rounded-xl font-bold transition w-full ${isEligible ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                    {isEligible ? 'Start Application' : 'Not Eligible Yet'}
                </button>
            </div>
        );
    }

    // 2. ACTIVE LOAN VIEW
    const isActive = loan.status === 'ACTIVE';
    const schedule = loan.schedule || {};
    const balance = schedule.running_balance || 0;
    
    // Status Flags
    const isArrears = schedule.status_text === 'ARREARS';
    const isPrepayment = schedule.status_text === 'PREPAYMENT';
    const isGracePeriod = schedule.status_text === 'GRACE PERIOD';

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
            {/* Background Icon */}
            <div className={`absolute top-0 right-0 p-4 ${isArrears ? 'text-red-500' : 'text-emerald-500'} opacity-10`}>
                <CreditCard size={100} />
            </div>
            
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Balance</p>
                    <p className="text-2xl font-bold text-slate-800">KES {(parseFloat(loan.total_due) - parseFloat(loan.amount_repaid)).toLocaleString()}</p>
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isActive ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                    {loan.status.replace('_', ' ')}
                </div>
            </div>

            {/* Performance Widget */}
            {isActive && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                    
                    {/* Status Banner */}
                    <div className={`p-3 rounded-xl flex items-center justify-between mb-4 ${
                        isArrears ? 'bg-red-50 border border-red-100' : 
                        isPrepayment ? 'bg-emerald-50 border border-emerald-100' : 
                        isGracePeriod ? 'bg-blue-50 border border-blue-100' :
                        'bg-slate-50 border border-slate-100'
                    }`}>
                        <div className="flex items-center gap-2">
                            {isArrears && <TrendingDown size={18} className="text-red-600"/>}
                            {isPrepayment && <TrendingUp size={18} className="text-emerald-600"/>}
                            {isGracePeriod && <Clock size={18} className="text-blue-600"/>}
                            
                            <div>
                                <p className={`text-xs font-bold uppercase ${
                                    isArrears ? 'text-red-600' : 
                                    isPrepayment ? 'text-emerald-600' : 
                                    'text-blue-600'
                                }`}>
                                    {schedule.status_text}
                                </p>
                                
                                {/* Show Prepayment Amount even in Grace Period */}
                                {(isArrears || isPrepayment || (isGracePeriod && balance > 0)) && (
                                    <p className="text-sm font-bold text-slate-800">
                                        {balance < 0 ? '-' : '+'} KES {Math.abs(balance).toLocaleString()}
                                    </p>
                                )}
                                
                                {/* Show Grace Days if in Grace Period */}
                                {isGracePeriod && (
                                    <p className="text-sm font-bold text-slate-800">
                                        {schedule.grace_days_remaining} Days Left
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Repayment Progress</span>
                        <span className="font-bold text-slate-700">{Math.round((loan.amount_repaid / loan.total_due) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                        <div className="bg-slate-800 h-2 rounded-full" style={{ width: `${(loan.amount_repaid / loan.total_due) * 100}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg">
                        <div className="text-slate-500">Weekly Due: <span className="font-bold text-slate-800">KES {schedule.weekly_installment?.toLocaleString()}</span></div>
                    </div>
                </div>
            )}
        </div>
    );
}