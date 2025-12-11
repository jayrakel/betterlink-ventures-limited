import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    RefreshCw, Download, PlusCircle, User, FileText, 
    CreditCard, Landmark, AlertCircle 
} from 'lucide-react';

// Components
import DashboardHeader from '../components/DashboardHeader';
import BalanceCard from '../features/wallet/components/BalanceCard';
import TransactionList from '../features/wallet/components/TransactionList';
import DepositModal from '../features/wallet/components/DepositModal';
import PaymentChannelsModal from '../features/wallet/components/PaymentChannelsModal';
import ProfileModal from '../features/auth/components/ProfileModal'; // Uses the full version I sent earlier
import LoanStatusCard from '../features/loans/components/LoanStatusCard';
import GuarantorManager from '../features/loans/components/GuarantorManager';
import VotingQueue from '../features/loans/components/VotingQueue'; // ✅ NEW: Voting Feature

// Hooks & Services
import { useWallet } from '../features/wallet/hooks/useWallet';
import { useLoans } from '../features/loans/hooks/useLoans';
import { downloadStatement } from '../features/wallet/services/walletService';
import { initApplication, submitApplication } from '../features/loans/services/loanService';

export default function MemberDashboard({ user, onLogout }) {
    const [showBalance, setShowBalance] = useState(false);
    
    // Modals
    const [isDepositOpen, setDepositOpen] = useState(false);
    const [isChannelsOpen, setChannelsOpen] = useState(false);
    const [isProfileOpen, setProfileOpen] = useState(false);

    // Data Hooks
    const { balance, transactions, loading: walletLoading, refreshWallet } = useWallet(user?.id);
    const { loan, loading: loanLoading, refreshLoans } = useLoans(user?.id);

    // Handlers
    const handleRefresh = () => {
        refreshWallet();
        refreshLoans();
    };

    const handleApplyLoan = async () => {
        if (!window.confirm("Start a new loan application?")) return;
        try {
            await initApplication();
            refreshLoans();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to start application");
        }
    };

    const handleSubmitLoan = async () => {
        const amount = prompt("Enter Amount (KES):");
        if (!amount) return;
        const purpose = prompt("Enter Purpose:");
        const weeks = prompt("Repayment Weeks (e.g. 12):");
        try {
            await submitApplication({ loanAppId: loan.id, amount, purpose, repaymentWeeks: weeks });
            alert("Application Submitted! Add guarantors now.");
            refreshLoans();
        } catch (err) { alert(err.response?.data?.error || "Submission failed"); }
    };

    if (walletLoading || loanLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-12 font-sans text-slate-800">
            <DashboardHeader user={user} onLogout={onLogout} title="Member Portal" />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
                
                {/* 1. Header Section */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Jambo, {user?.name || 'Member'}! 👋</h1>
                        <p className="text-slate-500">Your financial overview.</p>
                    </div>
                    
                    {/* ✅ REFRESH ICON BUTTON */}
                    <button onClick={handleRefresh} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-indigo-600 transition shadow-sm group">
                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>

                {/* 2. Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN: WALLET & ACTIONS */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Balance */}
                        <BalanceCard balance={balance.savings} shares={balance.shares} showBalance={showBalance} onToggleBalance={() => setShowBalance(!showBalance)}/>

                        {/* ✅ VOTING QUEUE (Restored) */}
                        <VotingQueue />

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-4">
                            <button onClick={() => setDepositOpen(true)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-emerald-300 transition group">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition"><PlusCircle size={24} /></div>
                                <span className="font-bold text-xs text-slate-700">Deposit</span>
                            </button>
                            <button onClick={() => setChannelsOpen(true)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-blue-300 transition group">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition"><Landmark size={24} /></div>
                                <span className="font-bold text-xs text-slate-700">Accounts</span>
                            </button>
                            <button onClick={() => setProfileOpen(true)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-indigo-300 transition group">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition"><User size={24} /></div>
                                <span className="font-bold text-xs text-slate-700">Profile</span>
                            </button>
                        </div>

                        {/* Loans Section */}
                        <div className="pt-4 border-t border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><CreditCard size={20} className="text-indigo-600"/> Loan Status</h3>
                            
                            <LoanStatusCard loan={loan} onApply={handleApplyLoan} />
                            
                            {/* Draft Actions */}
                            {loan?.status === 'FEE_PENDING' && (
                                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-amber-800 text-sm font-bold">
                                        <AlertCircle size={16}/> Application Started
                                    </div>
                                    <button onClick={handleSubmitLoan} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-700 transition">Enter Details</button>
                                </div>
                            )}
                            
                            {/* Guarantors */}
                            {(loan?.status === 'PENDING_GUARANTORS' || loan?.status === 'SUBMITTED') && (
                                <GuarantorManager loanId={loan.id} />
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: HISTORY */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-slate-400"/> Activity</h3>
                                <button onClick={downloadStatement} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition border border-transparent hover:border-blue-100">
                                    <Download size={14}/> Statement
                                </button>
                            </div>
                            <TransactionList transactions={transactions} />
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
            <DepositModal 
                isOpen={isDepositOpen} 
                onClose={() => setDepositOpen(false)} 
                userPhone={user?.phone_number} 
                activeLoan={loan} // Pass loan for auto-fill logic
            />
            <PaymentChannelsModal isOpen={isChannelsOpen} onClose={() => setChannelsOpen(false)} />
            <ProfileModal isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} user={user} />
        </div>
    );
}