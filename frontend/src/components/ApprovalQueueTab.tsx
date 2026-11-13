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
            <h2 className="text-xl font-extrabold text-white tracking-tight font-mono">
              HUMAN-IN-THE-LOOP (HIL) QUEUE
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              MANDATORY GOVERNANCE GATE
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Disputes suspended at LangGraph checkpoints exceeding ₹10,000 threshold or flagged for fraud.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium cursor-pointer transition-all self-start sm:self-auto flex items-center space-x-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Role Permission Alert */}
      {!canApprove && (
        <div className="glass-panel rounded-2xl p-4 border border-amber-500/30 bg-amber-950/20 flex items-start space-x-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Signed in with role <strong className="font-mono text-white">{currentRole.toUpperCase()}</strong>. Only{' '}
            <strong className="text-white font-mono">RISK_LEAD</strong> or{' '}
            <strong className="text-white font-mono">FIN_OPS_ADMIN</strong> can sign off on escalated disputes and issue
            cryptographic PolicyTokens. Switch persona in the top navigation bar to authorize.
          </p>
        </div>
      )}

      {/* Approvals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {approvals.length === 0 ? (
          <div className="col-span-full glass-panel rounded-3xl p-12 text-center space-y-3 border border-white/[0.06]">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs text-gray-400">
              No pending human approvals in queue. All active claims are either automated or resolved.
            </p>
          </div>
        ) : (
          approvals.map((appr) => (
            <div
              key={appr.id}
              className="glass-card rounded-2xl p-5 space-y-4 relative flex flex-col justify-between border-amber-500/20"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-white tracking-wider">
                    {appr.dispute_id}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                    {appr.status}
                  </span>
                </div>

                <div className="space-y-1 py-2 border-b border-white/[0.04]">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Escalated Claim Amount</span>
                  <div className="text-2xl font-black text-white font-mono">
                    ₹{appr.amount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-amber-300/90 flex items-center space-x-1 font-mono">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1 shrink-0" />
                    <span>Exceeds ₹10,000 automated policy ceiling</span>
                  </p>
                </div>

                <div className="text-xs bg-black/40 p-3 rounded-xl border border-white/[0.04] space-y-1.5 my-3">
                  <div className="flex justify-between text-gray-400 text-[11px]">
                    <span className="font-mono text-[10px] uppercase text-gray-500">Requester Agent:</span>
                    <span className="font-mono text-white font-semibold">{appr.requester_agent}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-[11px]">
                    <span className="font-mono text-[10px] uppercase text-gray-500">Required Role:</span>
                    <span className="font-mono text-amber-400 font-bold">{appr.required_role}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-white/[0.06]">
                <button
                  onClick={() => handleOpenAction(appr, 'APPROVE')}
                  disabled={!canApprove}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer shadow-glow-emerald text-center transition-all flex items-center justify-center space-x-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Authorize Refund</span>
                </button>
                <button
                  onClick={() => handleOpenAction(appr, 'REJECT')}
                  disabled={!canApprove}
                  className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-rose-300 text-xs font-semibold cursor-pointer text-center transition-all"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel bg-[#0d1017]/95 border border-white/[0.12] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 font-mono">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {actionType === 'APPROVE' ? 'Cryptographic Sign-Off & Token Issuance' : 'Reject Escalated Dispute'}
                </span>
              </h3>
              <button
                onClick={() => setSelectedAppr(null)}
                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-black/50 p-3.5 rounded-2xl border border-white/[0.06] space-y-1.5">
                <div className="flex justify-between text-gray-400">
                  <span className="font-mono text-[10px] uppercase text-gray-500">Dispute ID</span>
                  <span className="font-mono text-white font-semibold">{selectedAppr.dispute_id}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span className="font-mono text-[10px] uppercase text-gray-500">Amount</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    ₹{selectedAppr.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span className="font-mono text-[10px] uppercase text-gray-500">Signed By Role</span>
                  <span className="font-bold text-white font-mono">{currentRole.toUpperCase()}</span>
                </div>
              </div>

              {actionType === 'APPROVE' && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                  Signing off will invoke <strong className="text-white font-mono">DeterministicPolicyEngine.authorize_human_approval()</strong>, 
                  generate a short-lived HMAC-signed <strong className="text-white font-mono">PolicyToken</strong>, and resume LangGraph execution to 
                  execute the refund via MCP with full advisory lock protection.
                </div>
              )}

              <div>
                <label className="block text-gray-300 mb-1 font-semibold text-[11px] font-mono uppercase">
                  Review Audit Notes (Mandatory):
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setSelectedAppr(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer transition-all ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-glow-emerald'
                    : 'bg-rose-600 hover:bg-rose-500'
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
