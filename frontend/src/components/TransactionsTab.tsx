import React, { useState } from 'react';
import { ArrowUpDown, CheckCircle, CreditCard, RotateCw, Search } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionsTabProps {
  transactions: Transaction[];
  onFileDispute: (tx: Transaction) => void;
  onRefresh: () => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  onFileDispute,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = transactions.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.id.toLowerCase().includes(term) ||
      t.merchant_id.toLowerCase().includes(term) ||
      (t.customer_id && t.customer_id.toLowerCase().includes(term)) ||
      (t.customer_email && t.customer_email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Financial Transaction Ledger</h2>
          <p className="text-xs text-gray-400">
            Payment transactions with identity-scoped tenant access and PII masking.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by ID, customer, merchant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-64"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 text-xs cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Transaction ID</th>
                <th className="px-4 py-3 font-semibold">Merchant</th>
                <th className="px-4 py-3 font-semibold">Customer (Masked)</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Refunded</th>
                <th className="px-4 py-3 font-semibold">Remaining Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No transactions matching query.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-emerald-400">{t.id}</td>
                    <td className="px-4 py-3 font-mono text-gray-400">{t.merchant_id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-mono text-gray-200">{t.customer_id || 'N/A'}</span>
                        <div className="text-[10px] text-gray-500">{t.customer_email || 'redacted'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-300">{t.payment_method}</td>
                    <td className="px-4 py-3 font-bold text-white">₹{t.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-amber-400 font-mono">₹{t.refunded_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-emerald-400 font-mono font-bold">₹{t.eligible_refund_balance.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'SETTLED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : t.status === 'REFUNDED'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.eligible_refund_balance > 0 ? (
                        <button
                          onClick={() => onFileDispute(t)}
                          className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium cursor-pointer"
                        >
                          Dispute
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-500 italic">Fully Refunded</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
