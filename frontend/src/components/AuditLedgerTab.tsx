import React, { useState } from 'react';
import { CheckCircle2, Copy, Database, Hash, Lock, RotateCw, ShieldCheck, XCircle } from 'lucide-react';
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
      setVerifyResult(`Chain verified intact: ${res.total_records_verified} blocks validated from genesis.`);
    } catch (err: any) {
      setVerifyResult(`Verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Tamper-Evident Audit Ledger</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SHA-256 HASH CHAIN
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Append-only non-repudiable audit records connecting every agent reasoning step, policy check, and human approval.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{verifying ? 'Auditing Blocks...' : 'Verify Cryptographic Chain'}</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 text-xs cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chain Status Banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between ${
        isChainIntact ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300' : 'border-rose-500/30 bg-rose-950/20 text-rose-300'
      }`}>
        <div className="flex items-center space-x-3">
          {isChainIntact ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="text-sm font-bold text-white">
              {isChainIntact ? 'Ledger Integrity Status: VERIFIED & UNTAMPERED' : 'Tamper Alert: Audit Chain Broken'}
            </div>
            <p className="text-xs text-gray-400">
              {verifyResult || 'Every record calculates current_hash = SHA256(prev_hash + timestamp + event_type + actor + payload)'}
            </p>
          </div>
        </div>
        <div className="hidden md:block font-mono text-xs text-gray-400">
          Total Blocks: <span className="text-white font-bold">{logs.length}</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800 font-sans">
              <tr>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Event Type</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Trace ID</th>
                <th className="px-4 py-3 font-semibold">Previous Hash</th>
                <th className="px-4 py-3 font-semibold">Current Hash</th>
                <th className="px-4 py-3 font-semibold">Payload Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.event_type.includes('SECURITY')
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : log.event_type.includes('POLICY')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : log.event_type.includes('MCP')
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {log.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-200">
                    {log.actor_type}:<span className="text-gray-400 text-[10px]">{log.actor_id}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-[11px]">{log.trace_id}</td>
                  <td className="px-4 py-3 text-gray-500 text-[10px]">{log.prev_hash.slice(0, 10)}...</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold text-[10px]">{log.current_hash.slice(0, 10)}...</td>
                  <td className="px-4 py-3 text-gray-400 text-[11px] truncate max-w-xs" title={log.event_payload}>
                    {log.event_payload}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
