import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  Maximize2,
  RefreshCw,
  Scale,
  Shield,
  ShieldCheck,
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
  const [zoomLevel, setZoomLevel] = useState(1);

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
    <div className="glass-panel rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between border border-white/[0.08] bg-[#0c0e14]/90 h-full">
      {/* Background Subtle Gradient & Grid Accent */}
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />

      <div>
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06] relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono">
                Settlement Topology
              </h3>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ACTIVE PIPELINE</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              LangGraph State Transitions &bull; Pure-Python Boundary &bull; Advisory Lock Integrity
            </p>
          </div>

          {/* Capacity Metrics */}
          <div className="flex items-center space-x-5">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 space-x-3">
                <span className="uppercase text-gray-500">Auto-Refund Capacity</span>
                <span className="text-emerald-400 font-bold tabular-nums">₹150 / ₹10,000</span>
              </div>
              <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 space-x-3">
                <span className="uppercase text-gray-500">Volume Headroom</span>
                <span className="text-cyan-400 font-bold tabular-nums">0.03%</span>
              </div>
              <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: '4%' }} />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-1 bg-white/[0.03] border border-white/[0.08] rounded-lg p-0.5">
              <button
                onClick={() => setSelectedNode('policy')}
                title="Reset Focus"
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={() => setZoomLevel((prev) => (prev === 1 ? 1.03 : 1))}
                title="Toggle Zoom"
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 4-Stage Architectural Pipeline */}
        <div
          className="my-5 p-3 rounded-xl bg-black/40 border border-white/[0.04] relative transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 relative z-10">
            {/* Stage 1: Intake */}
            <div
              onClick={() => setSelectedNode('intake')}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                selectedNode === 'intake'
                  ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm'
                  : 'bg-[#10131b]/80 border-white/[0.06] hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">01 // INTAKE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="text-white font-semibold text-xs mb-1 font-display">
                LangGraph Intake
              </div>
              <p className="text-[10px] text-gray-400 line-clamp-2">Schema validation & homoglyph normalization</p>
              <div className="mt-2 pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500">Thread</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>
            </div>

            {/* Stage 2: Investigation */}
            <div
              onClick={() => setSelectedNode('investigation')}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                selectedNode === 'investigation'
                  ? 'bg-indigo-950/30 border-indigo-500/50 shadow-sm'
                  : 'bg-[#10131b]/80 border-white/[0.06] hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">02 // INVESTIGATE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </div>
              <div className="text-white font-semibold text-xs mb-1 font-display">
                Evidence & OCR
              </div>
              <p className="text-[10px] text-gray-400 line-clamp-2">PII Scrubber masks PAN & CC before LLM</p>
              <div className="mt-2 pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500">LLM Mode</span>
                <span className="text-indigo-400">PROBABILISTIC</span>
              </div>
            </div>

            {/* Stage 3: Deterministic Policy Engine */}
            <div
              onClick={() => setSelectedNode('policy')}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                selectedNode === 'policy'
                  ? 'bg-amber-950/30 border-amber-500/60 shadow-sm'
                  : 'bg-[#10131b]/80 border-white/[0.06] hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  03 // POLICY GATE
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
              <div className="text-white font-semibold text-xs mb-1 font-display">
                Deterministic Engine
              </div>
              <p className="text-[10px] text-gray-300 line-clamp-2">Pure Python. Signed single-use execution tokens.</p>
              <div className="mt-2 pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500">Fail-Closed</span>
                <span className="text-amber-400 font-bold">ARMED</span>
              </div>
            </div>

            {/* Stage 4: MCP Financial Gateway */}
            <div
              onClick={() => setSelectedNode('mcp')}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                selectedNode === 'mcp'
                  ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm'
                  : 'bg-[#10131b]/80 border-white/[0.06] hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">04 // MCP GATE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>
              <div className="text-white font-semibold text-xs mb-1 font-display">
                Financial MCP Node
              </div>
              <p className="text-[10px] text-gray-400 line-clamp-2">Advisory lock isolation & token consumption</p>
              <div className="mt-2 pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500">Advisory Lock</span>
                <span className="text-cyan-400 font-bold">#884729104</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Deep Inspection */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.06] relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">{current.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-white/[0.04]">
                  {current.type}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400">
                  {current.status}
                </span>
              </div>
              <p className="text-xs text-gray-300 max-w-2xl">{current.description}</p>
            </div>

            <div className="flex items-center space-x-4 text-right shrink-0">
              <div>
                <span className="text-[9px] text-gray-500 block uppercase font-mono">Security Anchor</span>
                <span className="text-xs text-emerald-400 font-mono font-semibold">{current.security}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 block uppercase font-mono">Latency</span>
                <span className="text-xs text-white font-mono font-bold tabular-nums">{current.latency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Triggers */}
      <div className="pt-3.5 mt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-1.5 text-xs text-gray-400 font-mono text-[11px]">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real-time Invariant: Zero Token Replay & Strict Monotonicity</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onRunQuickDemo('auto')}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <Zap className="w-3 h-3" />
            <span>Test Auto-Refund</span>
          </button>
          <button
            onClick={() => onRunQuickDemo('high_val')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 text-xs font-semibold border border-white/[0.08] transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <Scale className="w-3 h-3" />
            <span>Test HIL Escalation</span>
          </button>
          <button
            onClick={() => onNavigate('disputes')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 text-xs font-semibold border border-white/[0.08] transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>Full Pipeline</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
