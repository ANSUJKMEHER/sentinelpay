import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  RefreshCw,
  Scale,
  Shield,
  Zap,
} from 'lucide-react';
import { SystemStats } from '../types';

interface TopologyCardProps {
  stats: SystemStats | null;
  onRunQuickDemo: (type: 'auto' | 'high_val' | 'adversarial') => void;
  onNavigate: (tab: string) => void;
}

export const TopologyCard: React.FC<TopologyCardProps> = ({
  stats,
  onRunQuickDemo,
  onNavigate,
}) => {
  const [selectedNode, setSelectedNode] = useState<'intake' | 'investigation' | 'policy' | 'mcp'>('policy');

  const nodeDetails = {
    intake: {
      name: 'Intake & Triage Node',
      type: 'LangGraph Orchestrator',
      status: 'OPERATIONAL',
      latency: '24ms',
      guarantee: 'State Checkpoint Isolation & Multi-Tenant Partitioning',
      description:
        'Validates dispute eligibility, normalizes claim payloads, strips homoglyphs, and initiates stateful LangGraph persistence.',
      security: 'PostgreSQL Checkpoint Saver (Thread ID Isolated)',
    },
    investigation: {
      name: 'Multi-Agent Investigation',
      type: 'LLM Reasoner + OCR Agent',
      status: 'BOUNDED EXECUTION',
      latency: '110ms',
      guarantee: 'PII Redaction & Untrusted Evidence Delimiter Tagging',
      description:
        'Analyzes OCR receipts and customer claims. LLM outputs confidence score and recommendation but CANNOT move money.',
      security: 'Regex PII Masking (CC, PAN, Aadhaar) + Adversarial Delimiters',
    },
    policy: {
      name: 'Deterministic Policy Engine',
      type: 'Pure Python Decision Gate',
      status: 'FAIL-CLOSED ARMED',
      latency: '2ms',
      guarantee: 'Mathematical Boundary Enforcement & Zero Probabilistic LLM Execution',
      description:
        'Evaluates rules (₹10,000 threshold, 60-day window, merchant dispute ratio). Issues cryptographically signed single-use policy tokens.',
      security: 'HMAC-SHA256 Signed Policy Tokens (60s TTL)',
    },
    mcp: {
      name: 'Financial MCP Gateway',
      type: 'Independent FastMCP Server',
      status: 'STRICTLY SCOPED',
      latency: '8ms',
      guarantee: 'Advisory Lock Concurrency & Idempotency Key De-duplication',
      description:
        'Requires valid signed policy token. Enforces atomic balance mutations with immediate rollback on error and error-audit persistence.',
      security: 'pg_advisory_xact_lock(884729104) + Monotonic Hash-Chain',
    },
  };

  const current = nodeDetails[selectedNode];

  return (
    <div className="bg-[#0b0d10] border border-white/[0.05] rounded-xl p-5 flex flex-col justify-between h-full space-y-4">
      {/* Top Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-mono font-semibold text-white tracking-widest uppercase">
                Settlement Pipeline
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              LangGraph Multi-Agent States &bull; Advisory Lock Integrity
            </p>
          </div>

          {/* Minimalist Capacity Gauges */}
          <div className="flex items-center space-x-5 text-[11px] font-mono">
            <div>
              <span className="text-zinc-500 text-[10px] uppercase block">Auto-Refund Cap</span>
              <span className="text-zinc-200 font-medium tabular-nums">₹150 / ₹10,000</span>
            </div>
            <div>
              <span className="text-zinc-500 text-[10px] uppercase block">Volume Headroom</span>
              <span className="text-zinc-200 font-medium tabular-nums">0.03%</span>
            </div>
          </div>
        </div>

        {/* Linear Minimalist Stage Strip (No Boxy Nested Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
          {/* Stage 1 */}
          <button
            onClick={() => setSelectedNode('intake')}
            className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${
              selectedNode === 'intake'
                ? 'bg-white/[0.06] border-white/[0.12]'
                : 'bg-white/[0.015] border-white/[0.03] hover:bg-white/[0.03]'
            }`}
          >
            <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">01 / Intake</span>
            <span className="text-xs font-medium text-white block">LangGraph Intake</span>
            <span className="text-[10px] text-zinc-400 mt-1 block">Homoglyph Scrubber</span>
          </button>

          {/* Stage 2 */}
          <button
            onClick={() => setSelectedNode('investigation')}
            className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${
              selectedNode === 'investigation'
                ? 'bg-white/[0.06] border-white/[0.12]'
                : 'bg-white/[0.015] border-white/[0.03] hover:bg-white/[0.03]'
            }`}
          >
            <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">02 / Evidence</span>
            <span className="text-xs font-medium text-white block">OCR & Claims</span>
            <span className="text-[10px] text-zinc-400 mt-1 block">PII Redaction</span>
          </button>

          {/* Stage 3 */}
          <button
            onClick={() => setSelectedNode('policy')}
            className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${
              selectedNode === 'policy'
                ? 'bg-white/[0.08] border-white/[0.16] shadow-sm'
                : 'bg-white/[0.015] border-white/[0.03] hover:bg-white/[0.03]'
            }`}
          >
            <span className="text-[10px] font-mono text-amber-400 uppercase block mb-1">03 / Policy</span>
            <span className="text-xs font-medium text-white block">Python Gate</span>
            <span className="text-[10px] text-zinc-400 mt-1 block">Fail-Closed Armed</span>
          </button>

          {/* Stage 4 */}
          <button
            onClick={() => setSelectedNode('mcp')}
            className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${
              selectedNode === 'mcp'
                ? 'bg-white/[0.06] border-white/[0.12]'
                : 'bg-white/[0.015] border-white/[0.03] hover:bg-white/[0.03]'
            }`}
          >
            <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">04 / Gateway</span>
            <span className="text-xs font-medium text-white block">Financial MCP</span>
            <span className="text-[10px] text-zinc-400 mt-1 block">Advisory Lock</span>
          </button>
        </div>

        {/* Minimal Inspection Detail */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.03] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-white font-mono">{current.name}</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.2 rounded">
                {current.type}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono text-zinc-400">
              <span>Latency: <strong className="text-white tabular-nums">{current.latency}</strong></span>
              <span>&bull;</span>
              <span>Status: <strong className="text-emerald-400">{current.status}</strong></span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">{current.description}</p>
          <div className="text-[10px] font-mono text-zinc-400 pt-1 border-t border-white/[0.03] flex items-center justify-between">
            <span>Security Guarantee</span>
            <span className="text-zinc-200">{current.security}</span>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="pt-3 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-zinc-400">
          State: Fully Synchronized
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onRunQuickDemo('auto')}
            className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium border border-white/[0.06] transition-colors cursor-pointer"
          >
            Run Auto-Refund
          </button>
          <button
            onClick={() => onRunQuickDemo('high_val')}
            className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium border border-white/[0.06] transition-colors cursor-pointer"
          >
            Run HIL Escalation
          </button>
          <button
            onClick={() => onNavigate('disputes')}
            className="px-2.5 py-1 rounded-md hover:bg-white/[0.04] text-zinc-400 hover:text-white text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>Details</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
