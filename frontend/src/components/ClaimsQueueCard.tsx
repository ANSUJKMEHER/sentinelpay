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
    <div className="glass-panel rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between border border-white/[0.08] bg-[#0c0e14]/90 h-full">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div>
            <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono">
              Claims Queue
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Total: <span className="text-white font-mono font-bold tabular-nums">{disputes.length} Items</span> &bull; Volume:{' '}
              <span className="text-emerald-400 font-mono font-bold tabular-nums">
                ₹{totalVolume.toLocaleString('en-IN')}
              </span>
            </p>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onNavigate('disputes')}
              className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Filter & Search"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dispute Cards List */}
        <div className="mt-3.5 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {disputes.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mx-auto text-gray-500">
                <Receipt className="w-5 h-5" />
              </div>
              <p className="text-xs text-gray-400">No active claims in queue.</p>
              <button
                onClick={() => onRunQuickDemo('auto')}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors inline-flex items-center space-x-1 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Ingest Sample Claim</span>
              </button>
            </div>
          ) : (
            disputes.map((d) => {
              const isAuto = d.policy_verdict === 'AUTO_APPROVED' || d.final_resolution === 'RESOLVED_REFUNDED';
              const isHIL = d.human_required || d.policy_verdict === 'ESCALATE_TO_HUMAN';

              return (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl bg-[#11141e]/90 border border-white/[0.06] hover:border-white/15 transition-all relative group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white font-mono tracking-tight">
                      {d.id}
                    </span>

                    <div>
                      {isAuto && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          AUTO APPROVED
                        </span>
                      )}
                      {isHIL && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          HIL QUEUE
                        </span>
                      )}
                      {!isAuto && !isHIL && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                          {d.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] py-2 border-y border-white/[0.04] font-mono">
                    <div>
                      <span className="text-gray-500 text-[9px] uppercase block">Merchant</span>
                      <span className="text-gray-300 font-medium truncate block">{d.merchant_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[9px] uppercase block">Disputed Amount</span>
                      <span className="text-emerald-400 font-bold tabular-nums">
                        ₹{d.disputed_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[9px] uppercase block">Stage</span>
                      <span className="text-gray-300 text-[10px]">{d.current_stage}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[9px] uppercase block">AI Confidence</span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${(d.ai_confidence || 0.95) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-300 tabular-nums">
                          {((d.ai_confidence || 0.95) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Category Pill Tag & Link */}
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      <span>{d.disputed_amount <= 10000 ? 'Auto-Refund Eligible (≤ ₹10k)' : 'Escalation Required'}</span>
                    </span>

                    <button
                      onClick={() => onNavigate('disputes')}
                      className="text-[11px] text-gray-400 hover:text-white font-medium flex items-center space-x-1 transition-colors font-mono"
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
      <div className="pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
        <button
          onClick={() => onNavigate('disputes')}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1 font-mono"
        >
          <span>View All Claims</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] font-mono text-gray-500">ISO-20022 Compliant Schema</span>
      </div>
    </div>
  );
};
