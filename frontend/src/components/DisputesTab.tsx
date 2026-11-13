import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FilePlus,
  Filter,
  Grid,
  Layers,
  List,
  Lock,
  Play,
  Receipt,
  RotateCw,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { Dispute, TimelineEntry, Transaction } from '../types';

interface DisputesTabProps {
  disputes: Dispute[];
  transactions: Transaction[];
  onTriggerInvestigation: (disputeId: string) => Promise<any>;
  onCreateDispute: (payload: {
    transaction_id: string;
    dispute_type: string;
    disputed_amount: number;
    claim_reason: string;
  }) => Promise<any>;
  onRefresh: () => void;
}

export const DisputesTab: React.FC<DisputesTabProps> = ({
  disputes,
  transactions,
  onTriggerInvestigation,
  onCreateDispute,
  onRefresh,
}) => {
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [liveTimeline, setLiveTimeline] = useState<TimelineEntry[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterType, setFilterType] = useState<string>('all');

  // Form State
  const [formTxId, setFormTxId] = useState(transactions[0]?.id || 'txn_1001');
  const [formType, setFormType] = useState('goods_not_received');
  const [formAmount, setFormAmount] = useState('750');
  const [formReason, setFormReason] = useState('Customer claims package was marked delivered but not received.');

  const handleRunInvestigation = async (disputeId: string) => {
    setInvestigatingId(disputeId);
    try {
      const res = await onTriggerInvestigation(disputeId);
      if (res.timeline) {
        setLiveTimeline(res.timeline);
      }
      onRefresh();
    } catch (err: any) {
      alert(`Investigation failed: ${err.message}`);
    } finally {
      setInvestigatingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onCreateDispute({
        transaction_id: formTxId,
        dispute_type: formType,
        disputed_amount: parseFloat(formAmount),
        claim_reason: formReason,
      });
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Error creating dispute: ${err.message}`);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (filterType === 'auto') return d.policy_verdict === 'AUTO_APPROVED';
    if (filterType === 'hil') return d.human_required || d.policy_verdict === 'REQUIRES_HUMAN_APPROVAL';
    if (filterType === 'intake') return d.status === 'INTAKE';
    return true;
  });

  return (
    <div className="space-y-6 py-6 pb-28">
      {/* Header & Controls Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight font-mono">
              DISPUTES & CLAIMS ENGINE
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {disputes.length} REGISTERED
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Decoupled Multi-Agent Lifecycle &bull; LangGraph Intake &bull; Heuristic Homoglyph Scrubber &bull; Pure-Python Boundary
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* View Mode Toggle */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 flex items-center space-x-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'cards' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Grid Card View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'table' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium cursor-pointer transition-all"
            title="Refresh disputes"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
          >
            <FilePlus className="w-4 h-4" />
            <span>File New Dispute</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-gray-500 text-[11px] uppercase font-mono mr-1">Filter:</span>
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 rounded-xl font-medium transition-all ${
            filterType === 'all'
              ? 'bg-white/[0.12] text-white border border-white/[0.15]'
              : 'text-gray-400 hover:text-gray-200 bg-white/[0.03]'
          }`}
        >
          All ({disputes.length})
        </button>
        <button
          onClick={() => setFilterType('auto')}
          className={`px-3 py-1 rounded-xl font-medium transition-all ${
            filterType === 'auto'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-gray-400 hover:text-gray-200 bg-white/[0.03]'
          }`}
        >
          Auto-Approved ({disputes.filter((d) => d.policy_verdict === 'AUTO_APPROVED').length})
        </button>
        <button
          onClick={() => setFilterType('hil')}
          className={`px-3 py-1 rounded-xl font-medium transition-all ${
            filterType === 'hil'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-gray-400 hover:text-gray-200 bg-white/[0.03]'
          }`}
        >
          HIL Queue ({disputes.filter((d) => d.human_required).length})
        </button>
        <button
          onClick={() => setFilterType('intake')}
          className={`px-3 py-1 rounded-xl font-medium transition-all ${
            filterType === 'intake'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-gray-400 hover:text-gray-200 bg-white/[0.03]'
          }`}
        >
          Intake ({disputes.filter((d) => d.status === 'INTAKE').length})
        </button>
      </div>

      {/* Main View: Cards Grid or Table */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDisputes.length === 0 ? (
            <div className="col-span-full glass-panel rounded-3xl p-12 text-center space-y-3">
              <Receipt className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-xs text-gray-400">No disputes match the selected filter criteria.</p>
            </div>
          ) : (
            filteredDisputes.map((d) => {
              const isAuto = d.policy_verdict === 'AUTO_APPROVED' || d.final_resolution === 'RESOLVED_REFUNDED';
              const isHIL = d.human_required || d.policy_verdict === 'REQUIRES_HUMAN_APPROVAL';

              return (
                <div
                  key={d.id}
                  className="glass-card rounded-2xl p-5 space-y-4 relative flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: ID, Badge, Timestamp */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-white tracking-wider">
                        {d.id}
                      </span>
                      <div>
                        {isAuto && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            AUTO_APPROVED
                          </span>
                        )}
                        {isHIL && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            HUMAN_REQ
                          </span>
                        )}
                        {!isAuto && !isHIL && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                            {d.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dispute Type & Amount */}
                    <div className="flex items-baseline justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-xs text-gray-300 font-medium capitalize">
                        {d.dispute_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-lg font-black text-white font-mono">
                        ₹{d.disputed_amount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] py-3 text-gray-400">
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-gray-500">Transaction</span>
                        <span className="font-mono text-gray-300">{d.transaction_id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-gray-500">Merchant</span>
                        <span className="text-gray-300 truncate block">{d.merchant_id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-gray-500">AI Confidence</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${(d.ai_confidence || 0.95) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-gray-300">
                            {((d.ai_confidence || 0.95) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-gray-500">Current Stage</span>
                        <span className="font-mono text-[10px] text-emerald-400 font-semibold">{d.current_stage}</span>
                      </div>
                    </div>

                    {/* AI Recommendation Pill */}
                    {d.ai_recommendation && (
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start space-x-2">
                        <Bot className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{d.ai_recommendation}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                      onClick={() => setSelectedDispute(d)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 text-xs font-semibold border border-white/[0.08] transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Context</span>
                    </button>

                    {d.status === 'INTAKE' && (
                      <button
                        onClick={() => handleRunInvestigation(d.id)}
                        disabled={investigatingId === d.id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-glow-emerald transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 fill-black" />
                        <span>{investigatingId === d.id ? 'Running...' : 'Run Agents'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Elevated Table View */
        <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1017]/90 text-gray-400 border-b border-white/[0.06] font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Dispute ID</th>
                  <th className="px-5 py-3.5 font-bold">Transaction</th>
                  <th className="px-5 py-3.5 font-bold">Type</th>
                  <th className="px-5 py-3.5 font-bold">Amount</th>
                  <th className="px-5 py-3.5 font-bold">AI Rec</th>
                  <th className="px-5 py-3.5 font-bold">Policy Verdict</th>
                  <th className="px-5 py-3.5 font-bold">Stage</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-gray-300">
                {filteredDisputes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-gray-500">
                      No disputes match this criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDisputes.map((d) => (
                    <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-white">{d.id}</td>
                      <td className="px-5 py-3.5 font-mono text-gray-400">{d.transaction_id}</td>
                      <td className="px-5 py-3.5 capitalize text-gray-300">{d.dispute_type.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3.5 font-bold text-white font-mono">
                        ₹{d.disputed_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-indigo-400 font-mono text-[11px]">
                        {d.ai_recommendation ? d.ai_recommendation.slice(0, 24) + '...' : 'Pending'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            d.policy_verdict === 'AUTO_APPROVED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : d.policy_verdict === 'REQUIRES_HUMAN_APPROVAL'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-white/[0.06] text-gray-400'
                          }`}
                        >
                          {d.policy_verdict || 'NOT_EVALUATED'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-gray-300">{d.current_stage}</td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedDispute(d)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-200 text-xs font-semibold cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Agent Execution Timeline Drawer */}
      {liveTimeline.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 space-y-4 shadow-2xl border border-emerald-500/30 bg-[#0c121d]/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  LangGraph Multi-Agent Execution Trace
                </h3>
                <p className="text-[11px] text-gray-400">Deterministic checkpointer persistence & state handoff</p>
              </div>
            </div>
            <button
              onClick={() => setLiveTimeline([])}
              className="text-xs text-gray-400 hover:text-white cursor-pointer px-3 py-1 rounded-lg bg-white/[0.04]"
            >
              Dismiss
            </button>
          </div>

          <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
            {liveTimeline.map((item, index) => (
              <div key={index} className="flex items-start space-x-4 relative">
                <div className="w-8 h-8 rounded-full bg-[#111624] border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 text-xs font-mono font-bold z-10 shadow-sm">
                  {index + 1}
                </div>
                <div className="flex-1 bg-[#121622]/90 rounded-2xl p-3.5 border border-white/[0.06] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300 font-mono text-[11px] uppercase tracking-wider">
                      {item.stage} &bull; {item.agent}
                    </span>
                    <span className="font-mono text-gray-500 text-[10px]">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300">{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispute Details Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel bg-[#0d1017]/95 border border-white/[0.12] rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">{selectedDispute.id}</span>
                <h3 className="text-lg font-black text-white">Dispute Context & Multi-Agent Findings</h3>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 bg-black/40 p-3.5 rounded-2xl border border-white/[0.04]">
                <span className="text-[10px] font-mono text-gray-400 uppercase">Transaction ID</span>
                <p className="font-mono text-white font-semibold">{selectedDispute.transaction_id}</p>
              </div>
              <div className="space-y-1 bg-black/40 p-3.5 rounded-2xl border border-white/[0.04]">
                <span className="text-[10px] font-mono text-gray-400 uppercase">Disputed Amount</span>
                <p className="text-emerald-400 font-mono font-black text-base">
                  ₹{selectedDispute.disputed_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="space-y-1 bg-black/40 p-3.5 rounded-2xl border border-white/[0.04]">
                <span className="text-[10px] font-mono text-gray-400 uppercase">AI Recommendation (Probabilistic)</span>
                <p className="font-semibold text-indigo-400 font-mono">
                  {selectedDispute.ai_recommendation || 'Pending Evaluation'}
                </p>
              </div>
              <div className="space-y-1 bg-black/40 p-3.5 rounded-2xl border border-white/[0.04]">
                <span className="text-[10px] font-mono text-gray-400 uppercase">Policy Verdict (Deterministic)</span>
                <p className="font-semibold text-emerald-400 font-mono">
                  {selectedDispute.policy_verdict || 'Pending Gate'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-mono text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Policy Engine Reasoning & Citations:
              </span>
              <div className="bg-black/60 p-4 rounded-2xl border border-white/[0.06] text-gray-200 font-mono text-xs leading-relaxed">
                {selectedDispute.policy_reason || 'No deterministic policy reason recorded.'}
              </div>
            </div>

            {/* Evidence Security & OCR Verification Card */}
            <div className="space-y-2 text-xs bg-black/40 p-4 rounded-2xl border border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Evidentiary OCR & Document Integrity:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Untrusted Input Tagged
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Uploaded PDFs, receipts, and OCR extractions are treated as untrusted inputs. Heuristic prompt-injection screening and Unicode confusable canonicalization are applied before policy evaluation.
              </p>
              {selectedDispute.policy_reason &&
                (selectedDispute.policy_reason.includes('adversarial') ||
                  selectedDispute.policy_reason.includes('injection')) && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono">
                    &bull; Warning: Adversarial injection payload detected in evidentiary text. Document authenticity score penalized.
                  </div>
                )}
            </div>

            {selectedDispute.final_resolution && (
              <div className="space-y-1 text-xs bg-emerald-950/30 p-4 rounded-2xl border border-emerald-500/30">
                <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase">
                  Execution / Final Settlement Resolution:
                </span>
                <p className="text-white font-mono font-semibold">{selectedDispute.final_resolution}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDispute(null)}
                className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-bold cursor-pointer transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File New Dispute Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="glass-panel bg-[#0d1017]/95 border border-white/[0.12] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-md font-black text-white font-mono uppercase">File FinTech Dispute</h3>
                <p className="text-[11px] text-gray-400">Ingest claim into LangGraph multi-agent pipeline</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">Target Transaction</label>
                <select
                  value={formTxId}
                  onChange={(e) => {
                    setFormTxId(e.target.value);
                    const tx = transactions.find((t) => t.id === e.target.value);
                    if (tx) setFormAmount(String(tx.amount));
                  }}
                  className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                >
                  {transactions.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#0f121a]">
                      {t.id} &bull; ₹{t.amount} ({t.merchant_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">Dispute Category</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                >
                  <option value="goods_not_received" className="bg-[#0f121a]">Goods Not Received</option>
                  <option value="unauthorized_transaction" className="bg-[#0f121a]">Unauthorized Transaction</option>
                  <option value="duplicate_charge" className="bg-[#0f121a]">Duplicate Charge</option>
                  <option value="defective_item" className="bg-[#0f121a]">Defective / Damaged Item</option>
                  <option value="subscription_cancelled" className="bg-[#0f121a]">Subscription Cancelled</option>
                  <option value="fraudulent_merchant" className="bg-[#0f121a]">Fraudulent Merchant</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">Claim Amount (INR ₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">Customer Claim Reason</label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  required
                />
                <span className="text-[10px] text-gray-500 font-mono block mt-1">
                  &bull; Scanned automatically by Prompt Injection Shield and Luhn PII Masker.
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold cursor-pointer shadow-glow-emerald transition-all"
              >
                Submit Claim
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
