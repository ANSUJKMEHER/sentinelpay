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
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight font-sans">
              Financial Transactions Ledger
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
              {transactions.length} SETTLED
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-normal">
            Real-time ledger with automated PII masking, idempotent settlement, and eligible refund balance tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by ID, customer, merchant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#111317] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/20 w-64 font-sans"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 hover:text-white text-xs cursor-pointer transition-colors"
            title="Refresh Transactions"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Financial Summary: Borderless Telemetry Bar */}
      <div className="sleek-panel rounded-xl overflow-hidden border border-white/[0.05] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.04]">
        <div className="p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-500 block tracking-wider">Total Volume Settled</span>
          <div className="text-xl font-semibold text-zinc-100 font-mono mt-0.5 tabular-nums">
            ₹{totalSettled.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">INR &bull; Authoritative Gateway Settlement</p>
        </div>

        <div className="p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-500 block tracking-wider">Total Disputed & Refunded</span>
          <div className="text-xl font-semibold text-zinc-200 font-mono mt-0.5 tabular-nums">
            ₹{totalRefunded.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">Scoped MCP Atomic Execution</p>
        </div>

        <div className="p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-500 block tracking-wider">PII Redaction Level</span>
          <div className="text-sm font-medium text-zinc-200 font-mono mt-1 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Luhn / PAN Masked</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">Zero Raw Cardholder Exposure</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="sleek-panel rounded-xl overflow-hidden border border-white/[0.05]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1015] text-zinc-400 border-b border-white/[0.04] font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Transaction ID</th>
                <th className="px-4 py-3 font-medium">Merchant ID</th>
                <th className="px-4 py-3 font-medium">Customer (Masked)</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Refunded</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-zinc-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-zinc-200">{t.id}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{t.merchant_id}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">
                      <div className="space-y-0.5">
                        <span className="text-zinc-300 block">{t.customer_id || 'cust_***4102'}</span>
                        <span className="text-[10px] text-zinc-500 block">{t.customer_email || '***@masked.com'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-zinc-100 tabular-nums">
                      ₹{t.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-zinc-300 tabular-nums">
                      ₹{t.refunded_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{t.payment_method}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onFileDispute(t)}
                        className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.06] transition-colors cursor-pointer inline-flex items-center space-x-1"
                      >
                        <FilePlus className="w-3 h-3 text-zinc-400" />
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
