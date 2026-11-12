import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Eye,
  FilePlus,
  Play,
  RotateCw,
  Scale,
  Shield,
  XCircle,
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

  return (
    <div className="space-y-6 py-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Dispute Operations & Investigation</h2>
          <p className="text-xs text-gray-400">
            Autonomous multi-agent lifecycle: Intake &rarr; Investigation &rarr; Evidence &rarr; Policy &rarr; Resolution
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 text-xs font-medium cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>File New Dispute</span>
          </button>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Dispute ID</th>
                <th className="px-4 py-3 font-semibold">Transaction</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">AI Recommendation</th>
                <th className="px-4 py-3 font-semibold">Policy Verdict</th>
                <th className="px-4 py-3 font-semibold">Current Stage</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No disputes found. Click "File New Dispute" to create one.
                  </td>
                </tr>
              ) : (
                disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-emerald-400">{d.id}</td>
                    <td className="px-4 py-3 font-mono text-gray-400">{d.transaction_id}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-800 text-gray-300 border border-gray-700">
                        {d.dispute_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">₹{d.disputed_amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {d.ai_recommendation ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Bot className="w-3 h-3 mr-1" />
                          {d.ai_recommendation}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Pending analysis</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.policy_verdict === 'AUTO_APPROVED' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          AUTO_APPROVED
                        </span>
                      )}
                      {d.policy_verdict === 'REQUIRES_HUMAN_APPROVAL' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3 mr-1" />
                          HUMAN_APPROVAL_REQ
                        </span>
                      )}
                      {d.policy_verdict === 'POLICY_REJECTED' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3 mr-1" />
                          POLICY_REJECTED
                        </span>
                      )}
                      {!d.policy_verdict && <span className="text-gray-500 italic">Not evaluated</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-gray-800 text-gray-300">
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDispute(d)}
                        className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1" />
                        Details
                      </button>
                      {d.status === 'INTAKE' && (
                        <button
                          onClick={() => handleRunInvestigation(d.id)}
                          disabled={investigatingId === d.id}
                          className="px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 inline mr-1" />
                          {investigatingId === d.id ? 'Running...' : 'Run Agents'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Agent Execution Timeline Drawer */}
      {liveTimeline.length > 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-[#0e1624] p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white">LangGraph Multi-Agent Execution Timeline</h3>
            </div>
            <button
              onClick={() => setLiveTimeline([])}
              className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-800">
            {liveTimeline.map((item, index) => (
              <div key={index} className="flex items-start space-x-4 relative">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 text-xs font-bold z-10">
                  {index + 1}
                </div>
                <div className="flex-1 bg-gray-900/80 rounded-lg p-3 border border-gray-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300 uppercase tracking-wider text-[11px]">
                      {item.stage} ({item.agent})
                    </span>
                    <span className="font-mono text-gray-500 text-[10px]">{new Date(item.timestamp).toLocaleTimeString()}</span>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-400">{selectedDispute.id}</span>
                <h3 className="text-lg font-bold text-white">Dispute Context & Multi-Agent Findings</h3>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-gray-400 hover:text-gray-200 text-sm font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 bg-gray-950/60 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-400">Transaction ID:</span>
                <p className="font-mono text-white font-semibold">{selectedDispute.transaction_id}</p>
              </div>
              <div className="space-y-1 bg-gray-950/60 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-400">Disputed Amount:</span>
                <p className="text-white font-bold text-sm">₹{selectedDispute.disputed_amount.toLocaleString()}</p>
              </div>
              <div className="space-y-1 bg-gray-950/60 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-400">AI Recommendation (Probabilistic):</span>
                <p className="font-semibold text-indigo-400">{selectedDispute.ai_recommendation || 'Pending'}</p>
              </div>
              <div className="space-y-1 bg-gray-950/60 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-400">Policy Verdict (Deterministic):</span>
                <p className="font-semibold text-emerald-400">{selectedDispute.policy_verdict || 'Pending'}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-gray-300 uppercase tracking-wide">Policy Engine Reasoning & Citations:</span>
              <div className="bg-gray-950/80 p-3.5 rounded-lg border border-gray-800 text-gray-300 font-mono text-[11px] leading-relaxed">
                {selectedDispute.policy_reason || 'No policy reason recorded.'}
              </div>
            </div>

            {/* Evidence Security & OCR Verification Card */}
            <div className="space-y-2 text-xs bg-gray-950/60 p-3.5 rounded-lg border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-300 uppercase tracking-wide">Evidentiary OCR & Document Integrity:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-800 text-gray-300">
                  Untrusted Input Tagged
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Uploaded PDFs, receipts, and OCR extractions are treated as untrusted inputs. Heuristic prompt-injection screening and Unicode confusable canonicalization are applied before policy evaluation.
              </p>
              {selectedDispute.policy_reason && (selectedDispute.policy_reason.includes('adversarial') || selectedDispute.policy_reason.includes('injection')) && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-500/40 text-red-300 text-[11px] font-mono">
                  &bull; Warning: Adversarial injection payload detected in evidentiary text. Document authenticity score penalized.
                </div>
              )}
            </div>

            {selectedDispute.final_resolution && (
              <div className="space-y-1 text-xs bg-emerald-950/30 p-3 rounded-lg border border-emerald-500/30">
                <span className="font-bold text-emerald-400">Execution / Final Resolution:</span>
                <p className="text-gray-200">{selectedDispute.final_resolution}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File New Dispute Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-md font-bold text-white">File New FinTech Dispute</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-200 cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Target Transaction</label>
                <select
                  value={formTxId}
                  onChange={(e) => {
                    setFormTxId(e.target.value);
                    const tx = transactions.find((t) => t.id === e.target.value);
                    if (tx) setFormAmount(String(tx.amount));
                  }}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                >
                  {transactions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} — ₹{t.amount} ({t.merchant_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Dispute Category</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="goods_not_received">Goods Not Received</option>
                  <option value="unauthorized_transaction">Unauthorized Transaction</option>
                  <option value="duplicate_charge">Duplicate Charge</option>
                  <option value="defective_item">Defective / Damaged Item</option>
                  <option value="subscription_cancelled">Subscription Cancelled</option>
                  <option value="fraudulent_merchant">Fraudulent Merchant</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Disputed Amount (INR ₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Customer Claim Reason</label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                  required
                />
                <span className="text-[10px] text-gray-500">
                  Protected by real-time Prompt Injection Shield and Luhn PII Redactor.
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-emerald-600/30"
              >
                Submit Dispute Claim
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
