import React from 'react';
import { Eye, EyeOff, Wallet, TrendingUp } from 'lucide-react';

export default function BalanceCard({ balance, shares, showBalance, onToggleBalance }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Wallet size={120} />
      </div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">Total Savings</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">
                {showBalance 
                  ? `KES ${balance?.toLocaleString()}` 
                  : '••••••••'}
              </h2>
              <button 
                onClick={onToggleBalance}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <TrendingUp size={24} className="text-blue-200" />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-black/20 rounded-lg px-4 py-2 backdrop-blur-sm">
            <p className="text-xs text-blue-200 mb-1">Share Capital</p>
            <p className="font-semibold">
              {showBalance ? `KES ${shares?.toLocaleString()}` : '••••'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}