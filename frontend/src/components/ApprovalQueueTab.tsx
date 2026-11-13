import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  RotateCw,
  Scale,
  Shield,
  ShieldAlert,
  UserCheck,
  XCircle,
  Zap,
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
    <div className="space-y-6 py-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight font-sans">
              Human-in-the-Loop (HIL) Queue
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20">
              MANDATORY GOVERNANCE GATE
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Disputes suspended at LangGraph checkpoints exceeding ₹10,000 threshold or flagged for fraud.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 hover:text-white text-xs cursor-pointer transition-colors self-start sm:self-auto flex items-center space-x-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Role Permission Alert */}
      {!canApprove && (
        <div className="rounded-xl p-3.5 border border-[#d29922]/20 bg-[#d29922]/5 flex items-start space-x-3 text-xs text-zinc-300">
          <ShieldAlert className="w-4 h-4 text-[#d29922] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Signed in with role <strong className="font-mono text-zinc-100">{currentRole.toUpperCase()}</strong>. Only{' '}
            <strong className="text-zinc-100 font-mono">RISK_LEAD</strong> or{' '}
            <strong className="text-zinc-100 font-mono">FIN_OPS_ADMIN</strong> can sign off on escalated disputes and issue
            cryptographic PolicyTokens. Switch persona in the top navigation bar to authorize.
          </p>
        </div>
      )}

      {/* Approvals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {approvals.length === 0 ? (
          <div className="col-span-full sleek-panel rounded-xl p-12 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-xs text-zinc-400">
              No pending human approvals in queue. All active claims are either automated or resolved.
            </p>
          </div>
        ) : (
          approvals.map((appr) => (
            <div
              key={appr.id}
              className="bg-[#0c0d10] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4.5 space-y-3.5 relative flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-zinc-200 tracking-tight">
                    {appr.dispute_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20 uppercase">
                    {appr.status}
                  </span>
                </div>

                <div className="space-y-1 py-2 border-b border-white/[0.04]">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">Escalated Claim Amount</span>
                  <div className="text-xl font-semibold text-zinc-100 font-mono tabular-nums">
                    ₹{appr.amount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-[#d29922] flex items-center space-x-1 font-mono">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1 shrink-0" />
                    <span>Exceeds ₹10,000 automated policy ceiling</span>
                  </p>
                </div>

                <div className="text-xs bg-[#111317]/60 p-2.5 rounded-lg border border-white/[0.04] space-y-1 my-3">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">Requester:</span>
                    <span className="font-mono text-zinc-200">{appr.requester_agent}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">Required Role:</span>
                    <span className="font-mono text-zinc-200 font-medium">{appr.required_role}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-white/[0.04]">
                <button
                  onClick={() => handleOpenAction(appr, 'APPROVE')}
                  disabled={!canApprove}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Authorize Refund</span>
                </button>
                <button
                  onClick={() => handleOpenAction(appr, 'REJECT')}
                  disabled={!canApprove}
                  className="py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0d10] border border-white/[0.08] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 font-mono">
                <UserCheck className="w-4 h-4 text-zinc-300" />
                <span>
                  {actionType === 'APPROVE' ? 'Cryptographic Sign-Off & Token Issuance' : 'Reject Escalated Dispute'}
                </span>
              </h3>
              <button
                onClick={() => setSelectedAppr(null)}
                className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#111317]/60 p-3 rounded-lg border border-white/[0.04] space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">Dispute ID</span>
                  <span className="font-mono text-zinc-200 font-medium">{selectedAppr.dispute_id}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">Amount</span>
                  <span className="font-semibold text-zinc-100 font-mono text-sm tabular-nums">
                    ₹{selectedAppr.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">Signed By Role</span>
                  <span className="font-medium text-zinc-200 font-mono">{currentRole.toUpperCase()}</span>
                </div>
              </div>

              {actionType === 'APPROVE' && (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] text-zinc-400 text-[11px] leading-relaxed">
                  Signing off will invoke <strong className="text-zinc-200 font-mono">DeterministicPolicyEngine.authorize_human_approval()</strong>, 
                  generate a short-lived HMAC-signed <strong className="text-zinc-200 font-mono">PolicyToken</strong>, and resume LangGraph execution to 
                  execute the refund via MCP with full advisory lock protection.
                </div>
              )}

              <div>
                <label className="block text-zinc-400 mb-1 text-[11px] font-mono uppercase tracking-wider">
                  Review Audit Notes (Mandatory):
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-[#111317] border border-white/[0.06] rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-white/20 text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-white/[0.04]">
              <button
                onClick={() => setSelectedAppr(null)}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  actionType === 'APPROVE'
                    ? 'bg-white text-black hover:bg-zinc-200 shadow-sm'
                    : 'bg-white/[0.08] hover:bg-white/[0.12] text-[#f85149]'
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
