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
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight font-sans">
              Disputes & Claims Engine
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
              {disputes.length} REGISTERED
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-normal">
            Decoupled multi-agent lifecycle &bull; LangGraph intake &bull; Heuristic homoglyph scrubber &bull; Pure-Python boundary
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 flex items-center space-x-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'cards' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-white'
              }`}
              title="Grid Card View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'table' ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 hover:text-white text-xs cursor-pointer transition-colors"
            title="Refresh disputes"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-medium cursor-pointer transition-colors shadow-sm"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>File New Dispute</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center space-x-1.5 text-xs">
        <span className="text-zinc-500 text-[11px] uppercase font-mono mr-1 tracking-wider">Filter:</span>
        <button
          onClick={() => setFilterType('all')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-white/[0.1] text-white border border-white/[0.1]'
              : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.02]'
          }`}
        >
          All ({disputes.length})
        </button>
        <button
          onClick={() => setFilterType('auto')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            filterType === 'auto'
              ? 'bg-[#3fb950]/15 text-[#3fb950] border border-[#3fb950]/25'
              : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.02]'
          }`}
        >
          Auto-Approved ({disputes.filter((d) => d.policy_verdict === 'AUTO_APPROVED').length})
        </button>
        <button
          onClick={() => setFilterType('hil')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            filterType === 'hil'
              ? 'bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/25'
              : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.02]'
          }`}
        >
          HIL Queue ({disputes.filter((d) => d.human_required).length})
        </button>
        <button
          onClick={() => setFilterType('intake')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            filterType === 'intake'
              ? 'bg-white/[0.1] text-white border border-white/[0.1]'
              : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.02]'
          }`}
        >
          Intake ({disputes.filter((d) => d.status === 'INTAKE').length})
        </button>
      </div>

      {/* Main View: Cards Grid or Table */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredDisputes.length === 0 ? (
            <div className="col-span-full sleek-panel rounded-xl p-12 text-center space-y-3">
              <Receipt className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-500">No disputes match the selected filter criteria.</p>
            </div>
          ) : (
            filteredDisputes.map((d) => {
              const isAuto = d.policy_verdict === 'AUTO_APPROVED' || d.final_resolution === 'RESOLVED_REFUNDED';
              const isHIL = d.human_required || d.policy_verdict === 'REQUIRES_HUMAN_APPROVAL';

              return (
                <div
                  key={d.id}
                  className="bg-[#0c0d10] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4.5 space-y-3 relative flex flex-col justify-between transition-colors group"
                >
                  <div>
                    {/* Header: ID, Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-semibold text-zinc-200 tracking-tight">
                        {d.id}
                      </span>
                      <div>
                        {isAuto && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
                            AUTO_APPROVED
                          </span>
                        )}
                        {isHIL && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20">
                            HUMAN_REQ
                          </span>
                        )}
                        {!isAuto && !isHIL && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                            {d.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dispute Type & Amount */}
                    <div className="flex items-baseline justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-xs text-zinc-300 font-medium capitalize">
                        {d.dispute_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-base font-semibold text-zinc-100 font-mono tabular-nums">
                        ₹{d.disputed_amount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] py-2.5 text-zinc-400">
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-zinc-500 tracking-wider">Transaction</span>
                        <span className="font-mono text-zinc-300">{d.transaction_id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-zinc-500 tracking-wider">Merchant</span>
                        <span className="text-zinc-300 truncate block">{d.merchant_id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-zinc-500 tracking-wider">AI Confidence</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <div className="w-14 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-zinc-400 rounded-full"
                              style={{ width: `${(d.ai_confidence || 0.95) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-zinc-400 tabular-nums">
                            {((d.ai_confidence || 0.95) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-zinc-500 tracking-wider">Current Stage</span>
                        <span className="font-mono text-[10px] text-zinc-300 font-medium">{d.current_stage}</span>
                      </div>
                    </div>

                    {/* AI Recommendation Pill */}
                    {d.ai_recommendation && (
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] text-zinc-400 flex items-start space-x-2">
                        <Bot className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{d.ai_recommendation}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-3 hairline-t flex items-center justify-between">
                    <button
                      onClick={() => setSelectedDispute(d)}
                      className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 text-xs font-medium border border-white/[0.06] transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Inspect Context</span>
                    </button>

                    {d.status === 'INTAKE' && (
                      <button
                        onClick={() => handleRunInvestigation(d.id)}
                        disabled={investigatingId === d.id}
                        className="px-3 py-1 rounded-md bg-white text-black hover:bg-zinc-200 text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
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
        <div className="sleek-panel rounded-xl overflow-hidden border border-white/[0.05]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1015] text-zinc-400 border-b border-white/[0.04] font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Dispute ID</th>
                  <th className="px-4 py-3 font-medium">Transaction</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">AI Rec</th>
                  <th className="px-4 py-3 font-medium">Policy Verdict</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-zinc-300">
                {filteredDisputes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                      No disputes match this criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDisputes.map((d) => (
                    <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-zinc-200">{d.id}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{d.transaction_id}</td>
                      <td className="px-4 py-3 capitalize text-zinc-300">{d.dispute_type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-100 font-mono tabular-nums">
                        ₹{d.disputed_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                        {d.ai_recommendation ? d.ai_recommendation.slice(0, 24) + '...' : 'Pending'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            d.policy_verdict === 'AUTO_APPROVED'
                              ? 'bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20'
                              : d.policy_verdict === 'REQUIRES_HUMAN_APPROVAL'
                              ? 'bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20'
                              : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
                          }`}
                        >
                          {d.policy_verdict || 'NOT_EVALUATED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{d.current_stage}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedDispute(d)}
                          className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium cursor-pointer transition-colors"
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
        <div className="sleek-panel rounded-xl p-5 space-y-4 border border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider">
                  LangGraph Multi-Agent Execution Trace
                </h3>
                <p className="text-[11px] text-zinc-500">Deterministic checkpointer persistence & state handoff</p>
              </div>
            </div>
            <button
              onClick={() => setLiveTimeline([])}
              className="text-xs text-zinc-400 hover:text-white cursor-pointer px-2.5 py-1 rounded bg-white/[0.04] transition-colors"
            >
              Dismiss
            </button>
          </div>

          <div className="space-y-2.5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/[0.06]">
            {liveTimeline.map((item, index) => (
              <div key={index} className="flex items-start space-x-3.5 relative">
                <div className="w-7 h-7 rounded-full bg-[#111317] border border-white/[0.08] flex items-center justify-center shrink-0 text-zinc-300 text-[11px] font-mono font-medium z-10">
                  {index + 1}
                </div>
                <div className="flex-1 bg-[#111317]/80 rounded-lg p-3 border border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-200 font-mono text-[11px] uppercase tracking-wider">
                      {item.stage} &bull; {item.agent}
                    </span>
                    <span className="font-mono text-zinc-500 text-[10px]">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispute Details Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0d10] border border-white/[0.08] rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3.5">
              <div>
                <span className="text-xs font-mono text-zinc-400 font-medium">{selectedDispute.id}</span>
                <h3 className="text-base font-semibold text-zinc-100">Dispute Context & Multi-Agent Findings</h3>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer text-sm"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="space-y-1 bg-[#111317]/60 p-3 rounded-lg border border-white/[0.04]">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Transaction ID</span>
                <p className="font-mono text-zinc-200 font-medium">{selectedDispute.transaction_id}</p>
              </div>
              <div className="space-y-1 bg-[#111317]/60 p-3 rounded-lg border border-white/[0.04]">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Disputed Amount</span>
                <p className="text-zinc-100 font-mono font-semibold text-sm tabular-nums">
                  ₹{selectedDispute.disputed_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="space-y-1 bg-[#111317]/60 p-3 rounded-lg border border-white/[0.04]">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">AI Recommendation (Probabilistic)</span>
                <p className="font-medium text-zinc-300 font-mono text-xs">
                  {selectedDispute.ai_recommendation || 'Pending Evaluation'}
                </p>
              </div>
              <div className="space-y-1 bg-[#111317]/60 p-3 rounded-lg border border-white/[0.04]">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Policy Verdict (Deterministic)</span>
                <p className="font-medium text-zinc-200 font-mono text-xs">
                  {selectedDispute.policy_verdict || 'Pending Gate'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-mono text-[10px] uppercase font-medium text-zinc-500 tracking-wider">
                Policy Engine Reasoning & Citations:
              </span>
              <div className="bg-[#111317] p-3.5 rounded-lg border border-white/[0.04] text-zinc-300 font-mono text-xs leading-relaxed">
                {selectedDispute.policy_reason || 'No deterministic policy reason recorded.'}
              </div>
            </div>

            {/* Evidence Security & OCR Verification Card */}
            <div className="space-y-2 text-xs bg-[#111317]/60 p-3.5 rounded-lg border border-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-medium text-zinc-500 tracking-wider">
                  Evidentiary OCR & Document Integrity:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-normal bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                  Untrusted Input Tagged
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Uploaded PDFs, receipts, and OCR extractions are treated as untrusted inputs. Heuristic prompt-injection screening and Unicode confusable canonicalization are applied before policy evaluation.
              </p>
              {selectedDispute.policy_reason &&
                (selectedDispute.policy_reason.includes('adversarial') ||
                  selectedDispute.policy_reason.includes('injection')) && (
                  <div className="p-2.5 rounded-md bg-[#f85149]/10 border border-[#f85149]/20 text-[#f85149] text-xs font-mono">
                    &bull; Warning: Adversarial injection payload detected in evidentiary text. Document authenticity score penalized.
                  </div>
                )}
            </div>

            {selectedDispute.final_resolution && (
              <div className="space-y-1 text-xs bg-white/[0.02] p-3.5 rounded-lg border border-white/[0.04]">
                <span className="font-mono text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Execution / Final Settlement Resolution:
                </span>
                <p className="text-zinc-200 font-mono font-medium">{selectedDispute.final_resolution}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File New Dispute Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-[#0c0d10] border border-white/[0.08] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 font-mono uppercase tracking-wider">File FinTech Dispute</h3>
                <p className="text-[11px] text-zinc-500">Ingest claim into LangGraph multi-agent pipeline</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer text-sm"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Target Transaction</label>
                <select
                  value={formTxId}
                  onChange={(e) => {
                    setFormTxId(e.target.value);
                    const tx = transactions.find((t) => t.id === e.target.value);
                    if (tx) setFormAmount(String(tx.amount));
                  }}
                  className="w-full bg-[#111317] border border-white/[0.06] rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-white/20 font-mono text-xs"
                >
                  {transactions.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#111317]">
                      {t.id} &bull; ₹{t.amount} ({t.merchant_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Dispute Category</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-[#111317] border border-white/[0.06] rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-white/20 text-xs"
                >
                  <option value="goods_not_received" className="bg-[#111317]">Goods Not Received</option>
                  <option value="unauthorized_transaction" className="bg-[#111317]">Unauthorized Transaction</option>
                  <option value="duplicate_charge" className="bg-[#111317]">Duplicate Charge</option>
                  <option value="defective_item" className="bg-[#111317]">Defective / Damaged Item</option>
                  <option value="subscription_cancelled" className="bg-[#111317]">Subscription Cancelled</option>
                  <option value="fraudulent_merchant" className="bg-[#111317]">Fraudulent Merchant</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Claim Amount (INR ₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-[#111317] border border-white/[0.06] rounded-lg p-2 text-zinc-100 focus:outline-none focus:border-white/20 font-mono font-medium text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Customer Claim Reason</label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full bg-[#111317] border border-white/[0.06] rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-white/20 text-xs"
                  required
                />
                <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                  &bull; Scanned automatically by Prompt Injection Shield and Luhn PII Masker.
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-white/[0.04]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-medium cursor-pointer transition-colors shadow-sm"
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
