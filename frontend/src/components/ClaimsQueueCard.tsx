import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Package,
  Receipt,
  Scale,
  Shield,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Dispute, Transaction } from '../types';

interface ClaimsQueueCardProps {
  disputes: Dispute[];
  transactions: Transaction[];
  onNavigate: (tab: string) => void;
  onSelectDispute?: (dispute: Dispute) => void;
  onRunQuickDemo: (type: 'auto' | 'high_val' | 'adversarial') => void;
}

export const ClaimsQueueCard: React.FC<ClaimsQueueCardProps> = ({
  disputes,
  transactions,
  onNavigate,
  onSelectDispute,
  onRunQuickDemo,
}) => {
  const totalVolume = disputes.reduce((acc, d) => acc + (d.disputed_amount || 0), 0);

  return (
    <div className="glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between border border-white/[0.08] bg-[#0c0e14]/90 h-full">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Claims Queue</h3>
              <p className="text-[11px] text-gray-400">
                Total: <span className="text-white font-mono font-semibold">{disputes.length} Items</span> &bull; Volume:{' '}
                <span className="text-emerald-400 font-mono font-semibold">₹{totalVolume.toLocaleString('en-IN')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('disputes')}
              className="p-1.5 rounded-xl bg-gray-900/80 border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all"
              title="Filter & Search"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dispute Cards List */}
        <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {disputes.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-gray-500">
                <Receipt className="w-6 h-6" />
              </div>
              <p className="text-xs text-gray-400">No active financial claims in queue.</p>
              <button
                onClick={() => onRunQuickDemo('auto')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Trigger Sample Claim</span>
              </button>
            </div>
          ) : (
            disputes.map((d) => {
              const tx = transactions.find((t) => t.id === d.transaction_id);
              const isAuto = d.policy_verdict === 'AUTO_REFUND' || d.final_resolution === 'RESOLVED_REFUNDED';
              const isHIL = d.human_required || d.policy_verdict === 'ESCALATE_TO_HUMAN';

              return (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl bg-[#131622]/90 border border-white/[0.06] hover:border-white/20 transition-all duration-300 relative group hover:shadow-lg hover:shadow-black/40"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-gray-300">
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white font-mono tracking-wider">
                          {d.id.length > 16 ? `${d.id.slice(0, 14)}...` : d.id}
                        </span>
                        <span className="text-[10px] text-gray-500 block uppercase font-mono">
                          {d.dispute_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isAuto && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>AUTO APPROVED</span>
                        </span>
                      )}
                      {isHIL && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>HIL QUEUE</span>
                        </span>
                      )}
                      {!isAuto && !isHIL && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                          {d.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] py-2 border-y border-white/[0.04]">
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-mono block">Merchant</span>
                      <span className="text-gray-200 font-medium truncate block">{d.merchant_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-mono block">Claim Amount</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        ₹{d.disputed_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-mono block">Stage</span>
                      <span className="text-gray-300 font-mono text-[10px]">{d.current_stage}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-mono block">AI Confidence</span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${(d.ai_confidence || 0.95) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-gray-300">
                          {((d.ai_confidence || 0.95) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Category Pill Tag */}
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>{d.disputed_amount <= 10000 ? 'Auto-Refund Eligible (≤ ₹10k)' : 'Escalation Required'}</span>
                    </span>

                    <button
                      onClick={() => onNavigate('disputes')}
                      className="text-[11px] text-gray-400 hover:text-white font-medium flex items-center space-x-1 transition-colors"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
        <button
          onClick={() => onNavigate('disputes')}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1.5"
        >
          <span>View All Claims</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] font-mono text-gray-500">ISO-20022 Compliant Schema</span>
      </div>
    </div>
  );
};
