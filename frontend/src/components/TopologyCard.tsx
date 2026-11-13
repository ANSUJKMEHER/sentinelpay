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
    <div className="glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between border border-white/[0.08] bg-[#0c0e14]/90">
      {/* Background Subtle Gradient & Grid Accent */}
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Top Header: Title, Capacity Metrics & Control Icons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/[0.06] relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Settlement Topology</h3>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Fully Loaded</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-400">End-to-End Governed Multi-Agent Execution Pipeline</p>
            </div>
          </div>

          {/* Capacity Metrics */}
          <div className="flex items-center space-x-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-gray-400 space-x-4">
                <span>Auto-Refund Capacity</span>
                <span className="font-mono text-emerald-400 font-semibold">₹150 / ₹10,000</span>
              </div>
              <div className="w-36 h-2 bg-gray-800/80 rounded-full overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: '15%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-gray-400 space-x-4">
                <span>Daily Volume Headroom</span>
                <span className="font-mono text-cyan-400 font-semibold">0.03%</span>
              </div>
              <div className="w-36 h-2 bg-gray-800/80 rounded-full overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: '4%' }} />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-1.5 bg-gray-900/80 border border-white/[0.08] rounded-xl p-1">
              <button
                onClick={() => setSelectedNode('policy')}
                title="Reset Focus"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel((prev) => (prev === 1 ? 1.05 : 1))}
                title="Toggle Zoom"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive 3D Pipeline Topology Graph */}
        <div
          className="my-6 p-4 rounded-2xl bg-black/40 border border-white/[0.04] relative transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative z-10">
            {/* Stage 1: Intake */}
            <div
              onClick={() => setSelectedNode('intake')}
              className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-300 relative border ${
                selectedNode === 'intake'
                  ? 'bg-gradient-to-b from-emerald-500/15 to-emerald-950/30 border-emerald-500/50 shadow-glow-emerald scale-[1.02]'
                  : 'bg-[#12151e]/80 border-white/[0.06] hover:border-white/20 hover:bg-[#161a26]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">01 // INTAKE</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="flex items-center space-x-2 text-white font-semibold text-xs mb-1">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                <span>LangGraph Intake</span>
              </div>
              <p className="text-[10px] text-gray-400 line-clamp-2">Schema validation & homoglyph normalization</p>
              <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>Thread State</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>
            </div>

            {/* Stage 2: Investigation */}
            <div
              onClick={() => setSelectedNode('investigation')}
              className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-300 relative border ${
                selectedNode === 'investigation'
                  ? 'bg-gradient-to-b from-indigo-500/15 to-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                  : 'bg-[#12151e]/80 border-white/[0.06] hover:border-white/20 hover:bg-[#161a26]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">02 // INVESTIGATE</span>
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
              </div>
              <div className="flex items-center space-x-2 text-white font-semibold text-xs mb-1">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Evidence & OCR</span>
              </div>
              <p className="text-[10px] text-gray-400 line-clamp-2">PII Scrubber masks PAN & CC before LLM</p>
              <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>LLM Output</span>
                <span className="text-indigo-400">PROBABILISTIC</span>
              </div>
            </div>

            {/* Stage 3: Deterministic Policy Engine (Highlighted Hero) */}
            <div
              onClick={() => setSelectedNode('policy')}
              className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-300 relative border ${
                selectedNode === 'policy'
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/40 border-amber-500/60 shadow-glow-amber scale-[1.03]'
                  : 'bg-[#12151e]/80 border-white/[0.06] hover:border-white/20 hover:bg-[#161a26]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">03 // POLICY GATE</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <div className="flex items-center space-x-2 text-white font-bold text-xs mb-1">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Deterministic Engine</span>
              </div>
              <p className="text-[10px] text-gray-300 line-clamp-2">Pure Python. Signed single-use execution tokens.</p>
              <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-400">Fail-Closed</span>
                <span className="text-amber-400 font-bold">ARMED</span>
              </div>
            </div>

            {/* Stage 4: MCP Financial Gateway */}
            <div
              onClick={() => setSelectedNode('mcp')}
              className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-300 relative border ${
                selectedNode === 'mcp'
                  ? 'bg-gradient-to-b from-cyan-500/15 to-cyan-950/30 border-cyan-500/50 shadow-glow-cyan scale-[1.02]'
                  : 'bg-[#12151e]/80 border-white/[0.06] hover:border-white/20 hover:bg-[#161a26]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">04 // MCP GATEWAY</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              <div className="flex items-center space-x-2 text-white font-semibold text-xs mb-1">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Financial MCP Node</span>
              </div>
              <p className="text-[10px] text-gray-400 line-clamp-2">Advisory lock isolation & token consumption</p>
              <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>Advisory Lock</span>
                <span className="text-cyan-400 font-mono">884729104</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Deep Inspection Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-900/90 via-[#10141f] to-gray-900/90 border border-white/[0.08] relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white uppercase font-mono tracking-wide">{current.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/[0.06] text-gray-300 border border-white/[0.08]">
                  {current.type}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {current.status}
                </span>
              </div>
              <p className="text-xs text-gray-300 max-w-2xl">{current.description}</p>
            </div>

            <div className="flex items-center space-x-4 text-right">
              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-mono">Security Anchor</span>
                <span className="text-xs text-emerald-400 font-mono font-semibold">{current.security}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-mono">Latency</span>
                <span className="text-xs text-white font-mono font-bold">{current.latency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Triggers */}
      <div className="pt-4 mt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Real-time Monitored Invariants: Zero Replays & Monotonic Sequences</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onRunQuickDemo('auto')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Test Auto-Refund</span>
          </button>
          <button
            onClick={() => onRunQuickDemo('high_val')}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Test HIL Escalation</span>
          </button>
          <button
            onClick={() => onNavigate('disputes')}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-200 text-xs font-semibold border border-white/[0.08] transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Full Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
