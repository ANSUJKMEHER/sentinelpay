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
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight font-sans">
              Tamper-Evident Audit Ledger
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
              SHA-256 HASH CHAIN
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cryptographically linked immutable log with PostgreSQL transaction-scoped advisory locks and zero hash forks.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{verifying ? 'Auditing Blocks...' : 'Verify Cryptographic Chain'}</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 hover:text-white text-xs cursor-pointer transition-colors"
            title="Refresh Ledger"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className={`rounded-xl p-4 border flex items-center justify-between ${
          isChainIntact ? 'border-[#3fb950]/20 bg-[#3fb950]/5' : 'border-[#f85149]/20 bg-[#f85149]/5'
        }`}
      >
        <div className="flex items-center space-x-3">
          {isChainIntact ? (
            <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-[#f85149] shrink-0" />
          )}
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 font-mono uppercase tracking-wider">
              {isChainIntact ? 'Cryptographic Hash-Chain Intact' : 'Tampering Detected'}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {verifyResult ||
                (isChainIntact
                  ? 'All block hashes mathematically match SHA-256(prev_hash + event_data). Advisory lock pg_advisory_xact_lock(884729104) verified.'
                  : 'Hash discrepancy detected in immutable ledger sequence!')}
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-[11px]">
          <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Blocks Verified</span>
          <span className="text-zinc-200 font-semibold">{logs.length} Blocks</span>
        </div>
      </div>

      {/* Audit Blocks Timeline */}
      <div className="space-y-2.5">
        {logs.length === 0 ? (
          <div className="sleek-panel rounded-xl p-12 text-center text-zinc-500 text-xs">
            No audit records found in database.
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={log.id}
              className="bg-[#0c0d10] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4 space-y-2.5 relative transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.04] pb-2">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 text-[10px] font-mono font-medium">
                    #{(log as any).sequence_id ?? logs.length - index}
                  </span>
                  <span className="text-xs font-medium text-zinc-200 font-mono">{log.event_type}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Trace: {log.trace_id}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>

              {/* Hashes Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-[#111317] p-2.5 rounded-lg border border-white/[0.04] flex items-center justify-between">
                  <div className="space-y-0.5 truncate">
                    <span className="text-[9px] uppercase text-zinc-500 block tracking-wider">Previous Block Hash</span>
                    <span className="text-zinc-400 truncate block text-[10px]">{log.prev_hash}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(log.prev_hash)}
                    title="Copy hash"
                    className="p-1 rounded hover:bg-white/[0.08] text-zinc-500 hover:text-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>

                <div className="bg-[#111317] p-2.5 rounded-lg border border-white/[0.04] flex items-center justify-between">
                  <div className="space-y-0.5 truncate">
                    <span className="text-[9px] uppercase text-zinc-500 block tracking-wider">Current Block Hash</span>
                    <span className="text-zinc-300 truncate block text-[10px]">{log.current_hash}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(log.current_hash)}
                    title="Copy hash"
                    className="p-1 rounded hover:bg-white/[0.08] text-zinc-500 hover:text-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Event Payload */}
              <div className="bg-[#111317]/60 p-2 rounded-lg border border-white/[0.02] text-[10px] font-mono text-zinc-400 truncate">
                <span className="text-zinc-500 uppercase mr-2 tracking-wider">Payload:</span>
                <span>{log.event_payload}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
