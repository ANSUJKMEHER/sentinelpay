import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  RotateCw,
  ShieldAlert,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { ApprovalItem } from '../types';

interface ApprovalQueueTabProps {
  approvals: ApprovalItem[];
  currentRole: string;
  onResolveApproval: (approvalId: string, action: 'APPROVE' | 'REJECT', notes: string) => Promise<any>;
  onRefresh: () => void;
}

export const ApprovalQueueTab: React.FC<ApprovalQueueTabProps> = ({
  approvals,
  currentRole,
  onResolveApproval,
  onRefresh,
}) => {
  const [selectedAppr, setSelectedAppr] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('Reviewed courier evidence and authorized exception refund.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canApprove = currentRole === 'risk_lead' || currentRole === 'admin';

  const handleOpenAction = (appr: ApprovalItem, action: 'APPROVE' | 'REJECT') => {
    setSelectedAppr(appr);
    setActionType(action);
    setReviewNotes(
      action === 'APPROVE'
        ? `Authorized by ${currentRole.toUpperCase()}: Evidence confirmed, issuing refund exception.`
        : `Rejected by ${currentRole.toUpperCase()}: Evidence does not support claim.`
    );
  };

  const handleConfirmSubmit = async () => {
    if (!selectedAppr) return;
    setIsSubmitting(true);
    try {
      await onResolveApproval(selectedAppr.id, actionType, reviewNotes);
      setSelectedAppr(null);
      onRefresh();
    } catch (err: any) {
      alert(`Approval action failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Human-in-the-Loop (HIL) Approval Queue</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              MANDATORY GOVERNANCE GATE
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Disputes suspended at LangGraph checkpoints exceeding ₹10,000 or triggering fraud anomaly flags.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 text-xs font-medium cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {!canApprove && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex items-start space-x-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p>
            You are currently signed in with role <strong className="font-mono">{currentRole.toUpperCase()}</strong>. Only{' '}
            <strong className="text-white">RISK_LEAD</strong> or <strong className="text-white">FIN_OPS_ADMIN</strong> can sign off on escalated
            disputes and issue cryptographic PolicyTokens. Switch persona in the header navbar to approve.
          </p>
        </div>
      )}

      {/* Approvals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {approvals.length === 0 ? (
          <div className="col-span-full rounded-xl border border-gray-800 bg-gray-900/40 p-8 text-center text-gray-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            No pending human approvals. All current disputes are either automated or fully resolved.
          </div>
        ) : (
          approvals.map((appr) => (
            <div
              key={appr.id}
              className="rounded-xl border border-gray-800 hover:border-gray-700 bg-gray-900/70 p-5 space-y-4 shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400">{appr.dispute_id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                  {appr.status}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-gray-400">Escalated Claim Amount:</span>
                <div className="text-2xl font-extrabold text-white">₹{appr.amount.toLocaleString()}</div>
                <p className="text-[11px] text-amber-400/90 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1 shrink-0" />
                  <span>Exceeds ₹10,000 automated policy ceiling</span>
                </p>
              </div>

              <div className="text-xs bg-gray-950/70 p-3 rounded-lg border border-gray-800 space-y-1">
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>Requester:</span>
                  <span className="font-mono text-gray-200">{appr.requester_agent}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>Required Signer:</span>
                  <span className="font-semibold text-amber-300">{appr.required_role}</span>
                </div>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => handleOpenAction(appr, 'APPROVE')}
                  disabled={!canApprove}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold cursor-pointer shadow-md shadow-emerald-600/20 text-center"
                >
                  <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                  Authorize Refund
                </button>
                <button
                  onClick={() => handleOpenAction(appr, 'REJECT')}
                  disabled={!canApprove}
                  className="py-2 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-rose-300 text-xs font-semibold cursor-pointer text-center"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation & Review Modal */}
      {selectedAppr && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {actionType === 'APPROVE' ? 'Cryptographic Sign-Off & Authorization' : 'Reject Escalated Dispute'}
                </span>
              </h3>
              <button
                onClick={() => setSelectedAppr(null)}
                className="text-gray-400 hover:text-gray-200 font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>Dispute:</span>
                  <span className="font-mono text-white font-semibold">{selectedAppr.dispute_id}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Amount:</span>
                  <span className="font-bold text-white">₹{selectedAppr.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Signed By Role:</span>
                  <span className="font-bold text-emerald-400">{currentRole.toUpperCase()}</span>
                </div>
              </div>

              {actionType === 'APPROVE' && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                  Signing off will invoke <strong className="text-white">DeterministicPolicyEngine.authorize_human_approval()</strong>, 
                  generate a short-lived HMAC-signed <strong className="text-white">PolicyToken</strong>, and resume the LangGraph execution to 
                  execute the refund via MCP.
                </div>
              )}

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Review Audit Notes (Mandatory):</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-800">
              <button
                onClick={() => setSelectedAppr(null)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer shadow-md ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                {isSubmitting ? 'Signing...' : actionType === 'APPROVE' ? 'Issue PolicyToken & Execute' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
