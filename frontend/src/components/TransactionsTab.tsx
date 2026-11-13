import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle,
  CreditCard,
  FilePlus,
  Lock,
  Receipt,
  RotateCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
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

  const totalSettled = transactions.reduce((acc, t) => acc + t.amount, 0);
  const totalRefunded = transactions.reduce((acc, t) => acc + (t.refunded_amount || 0), 0);

  return (
    <div className="space-y-6 py-6 pb-28">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight font-mono">
              FINANCIAL TRANSACTIONS LEDGER
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {transactions.length} SETTLED
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time ledger with automated PII masking, idempotent settlement, and eligible refund balance tracking.
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
              className="bg-black/60 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-64 font-sans"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs cursor-pointer transition-all"
            title="Refresh Transactions"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="glass-card rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-gray-500 block">Total Volume Settled</span>
          <div className="text-2xl font-black text-white font-mono mt-0.5">
            ₹{totalSettled.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-gray-500 font-mono">INR &bull; Authoritative Gateway Settlement</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border-emerald-500/20">
          <span className="text-[10px] font-mono uppercase text-emerald-500 block">Total Disputed & Refunded</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
            ₹{totalRefunded.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-emerald-500/80 font-mono">Scoped MCP Atomic Execution</p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-gray-500 block">PII Redaction Level</span>
          <div className="text-xl font-bold text-white font-mono mt-0.5 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Luhn / PAN Masked</span>
          </div>
          <p className="text-[10px] text-gray-500 font-mono">Zero Raw Cardholder Exposure</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1017]/90 text-gray-400 border-b border-white/[0.06] font-mono text-[11px] uppercase">
              <tr>
                <th className="px-5 py-3.5 font-bold">Transaction ID</th>
                <th className="px-5 py-3.5 font-bold">Merchant ID</th>
                <th className="px-5 py-3.5 font-bold">Customer (Masked)</th>
                <th className="px-5 py-3.5 font-bold">Amount</th>
                <th className="px-5 py-3.5 font-bold">Refunded</th>
                <th className="px-5 py-3.5 font-bold">Method</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-gray-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-white">{t.id}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-300">{t.merchant_id}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-400">
                      <div className="space-y-0.5">
                        <span className="text-gray-200 block">{t.customer_id || 'cust_***4102'}</span>
                        <span className="text-[10px] text-gray-500 block">{t.customer_email || '***@masked.com'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-white">
                      ₹{t.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-emerald-400">
                      ₹{t.refunded_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-300">{t.payment_method}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onFileDispute(t)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-emerald-500/20 text-gray-200 hover:text-emerald-300 text-xs font-semibold border border-white/[0.08] hover:border-emerald-500/30 transition-all cursor-pointer inline-flex items-center space-x-1"
                      >
                        <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>File Claim</span>
                      </button>
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
