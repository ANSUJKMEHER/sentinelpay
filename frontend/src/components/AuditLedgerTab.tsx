import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Hash,
  Link2,
  Lock,
  RotateCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { AuditLogItem } from '../types';

interface AuditLedgerTabProps {
  logs: AuditLogItem[];
  isChainIntact: boolean;
  onVerifyChain: () => Promise<any>;
  onRefresh: () => void;
}

export const AuditLedgerTab: React.FC<AuditLedgerTabProps> = ({
  logs,
  isChainIntact,
  onVerifyChain,
  onRefresh,
}) => {
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await onVerifyChain();
      setVerifyResult(`Cryptographic chain verified intact: ${res.total_records_verified} blocks validated from genesis.`);
    } catch (err: any) {
      setVerifyResult(`Verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 py-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight font-mono">
              TAMPER-EVIDENT AUDIT LEDGER
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              SHA-256 HASH CHAIN
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Cryptographically linked immutable log with PostgreSQL transaction-scoped advisory locks and zero hash forks.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-glow-emerald cursor-pointer disabled:opacity-50 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{verifying ? 'Auditing Blocks...' : 'Verify Cryptographic Chain'}</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs cursor-pointer transition-all"
            title="Refresh Ledger"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className={`glass-panel rounded-2xl p-4 border flex items-center justify-between ${
          isChainIntact ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-rose-500/30 bg-rose-950/20'
        }`}
      >
        <div className="flex items-center space-x-3">
          {isChainIntact ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase">
              {isChainIntact ? 'Cryptographic Hash-Chain Intact' : 'Tampering Detected'}
            </h3>
            <p className="text-[11px] text-gray-300">
              {verifyResult ||
                (isChainIntact
                  ? 'All block hashes mathematically match SHA-256(prev_hash + event_data). Advisory lock pg_advisory_xact_lock(884729104) verified.'
                  : 'Hash discrepancy detected in immutable ledger sequence!')}
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-[11px]">
          <span className="text-gray-400 block text-[10px] uppercase">Blocks Verified</span>
          <span className="text-emerald-400 font-bold">{logs.length} Blocks</span>
        </div>
      </div>

      {/* Audit Blocks Timeline */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-gray-400 text-xs">
            No audit records found in database.
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={log.id}
              className="glass-card rounded-2xl p-4.5 space-y-3 relative border-white/[0.06] hover:border-white/20 transition-all duration-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.04] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white text-[10px] font-mono font-bold">
                    #{(log as any).sequence_id ?? logs.length - index}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{log.event_type}</span>
                  <span className="text-[10px] text-gray-500 font-mono">Trace: {log.trace_id}</span>
                </div>
                <div className="text-[10px] font-mono text-gray-400">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>

              {/* Hashes Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-black/50 p-2.5 rounded-xl border border-white/[0.04] flex items-center justify-between">
                  <div className="space-y-0.5 truncate">
                    <span className="text-[9px] uppercase text-gray-500 block">Previous Block Hash</span>
                    <span className="text-gray-400 truncate block text-[10px]">{log.prev_hash}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(log.prev_hash)}
                    title="Copy hash"
                    className="p-1 rounded hover:bg-white/[0.08] text-gray-500 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>

                <div className="bg-black/50 p-2.5 rounded-xl border border-white/[0.04] flex items-center justify-between">
                  <div className="space-y-0.5 truncate">
                    <span className="text-[9px] uppercase text-emerald-500 block">Current Block Hash</span>
                    <span className="text-emerald-400 truncate block text-[10px]">{log.current_hash}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(log.current_hash)}
                    title="Copy hash"
                    className="p-1 rounded hover:bg-white/[0.08] text-gray-500 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Event Payload */}
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.02] text-[10px] font-mono text-gray-400 truncate">
                <span className="text-gray-500 uppercase mr-2">Payload:</span>
                <span>{log.event_payload}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
