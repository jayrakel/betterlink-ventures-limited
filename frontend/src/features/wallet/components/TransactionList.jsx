import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function TransactionList({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
        No recent transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Type</th>
            <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Reference</th>
            <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
            <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    ['DEPOSIT', 'LOAN_REPAYMENT'].includes(tx.type) 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {['DEPOSIT', 'LOAN_REPAYMENT'].includes(tx.type) 
                      ? <ArrowDownLeft size={14} /> 
                      : <ArrowUpRight size={14} />}
                  </div>
                  <span className="font-medium text-slate-700 text-sm">{tx.type.replace(/_/g, ' ')}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-slate-500 font-mono">{tx.reference_code}</td>
              <td className={`py-3 px-4 text-right text-sm font-bold ${
                ['DEPOSIT', 'LOAN_REPAYMENT'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-700'
              }`}>
                {['DEPOSIT', 'LOAN_REPAYMENT'].includes(tx.type) ? '+' : '-'} 
                KES {Math.abs(tx.amount).toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right text-sm text-slate-400">
                {new Date(tx.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}