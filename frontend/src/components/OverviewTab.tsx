import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  FileCheck2,
  Layers,
  Link2,
  Lock,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Dispute, SystemStats, Transaction } from '../types';
import { ClaimsQueueCard } from './ClaimsQueueCard';
import { TopologyCard } from './TopologyCard';

interface OverviewTabProps {
  stats: SystemStats | null;
  disputes: Dispute[];
  transactions: Transaction[];
  onNavigate: (tab: string) => void;
  onRunQuickDemo: (type: 'auto' | 'high_val' | 'adversarial') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  disputes,
  transactions,
  onNavigate,
  onRunQuickDemo,
}) => {
  return (
    <div className="space-y-6 py-6 pb-28">
      {/* KPI Stats Top Strip (High Density & Precision) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="glass-card rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">Disputes Ingested</span>
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {stats?.disputes.total ?? 0}
          </div>
          <p className="text-[10px] text-gray-500 font-mono">100% Invariant Check</p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-1 border-emerald-500/20">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">Auto-Refunded</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
            {stats?.disputes.resolved_refunded ?? 0}
          </div>
          <p className="text-[10px] text-emerald-500/80 font-mono">Passed Pure-Python Gate</p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-1 border-amber-500/20">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">Human Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
            {stats?.disputes.pending_human_review ?? 0}
          </div>
          <p className="text-[10px] text-amber-500/80 font-mono">Risk Lead Escalation</p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">Refund Volume</span>
            <Scale className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            ₹{(stats?.financial.total_refund_volume ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-gray-500 font-mono">Scoped MCP Settlement</p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">Threats Blocked</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
            {stats?.security.threats_blocked ?? 0}
          </div>
          <p className="text-[10px] text-rose-500/80 font-mono">Injections & Homoglyphs</p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-1 border-white/10">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">Audit Chain</span>
            <Link2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight flex items-center space-x-1">
            <span>INTACT</span>
          </div>
          <p className="text-[10px] text-emerald-500/80 font-mono">Advisory Lock Protected</p>
        </div>
      </div>

      {/* Main Phenomenon Studio Layout: Split Bento Grid (Image 1 Inspiration) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 cols): Interactive FinTech Topology & Pipeline Monitor */}
        <div className="lg:col-span-7">
          <TopologyCard
            stats={stats}
            onRunQuickDemo={onRunQuickDemo}
            onNavigate={onNavigate}
          />
        </div>

        {/* Right Column (5 cols): Active Claims & Financial Queue (Packages Panel) */}
        <div className="lg:col-span-5">
          <ClaimsQueueCard
            disputes={disputes}
            transactions={transactions}
            onNavigate={onNavigate}
            onRunQuickDemo={onRunQuickDemo}
          />
        </div>
      </div>

      {/* Secondary Aceternity Bento Grid (Core Architectural Pillars) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono">
              Governance Architecture
            </h2>
            <p className="text-xs text-gray-400">
              Four Inviolable Security Pillars of the SentinelPay Monolith
            </p>
          </div>
          <button
            onClick={() => onNavigate('policy')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1"
          >
            <span>View All Rules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pillar 1: Decoupled AI & Financial Movement */}
          <div className="glass-card rounded-2xl p-5 space-y-3 relative group">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                1. Probabilistic Decoupling
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                LLMs investigate and draft recommendations, but have zero tool access to execute refunds or modify ledger state.
              </p>
            </div>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] font-mono text-indigo-400 flex items-center justify-between">
              <span>Authorization Mode</span>
              <span className="font-bold">ZERO DIRECT LLM MOVE</span>
            </div>
          </div>

          {/* Pillar 2: Deterministic Policy Gating */}
          <div className="glass-card rounded-2xl p-5 space-y-3 relative group border-amber-500/20">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                2. Pure-Python Policy Gate
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Evaluates strict mathematical constraints (₹10,000 threshold, 60-day regulatory window, merchant dispute ratio).
              </p>
            </div>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] font-mono text-amber-400 flex items-center justify-between">
              <span>Engine Status</span>
              <span className="font-bold">FAIL-CLOSED ARMED</span>
            </div>
          </div>

          {/* Pillar 3: Human-in-the-Loop Orchestration */}
          <div className="glass-card rounded-2xl p-5 space-y-3 relative group">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                3. Human-in-the-Loop HIL
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                High-value transactions suspend execution in persistent PostgreSQL checkpointers until an authorized Risk Lead approves.
              </p>
            </div>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] font-mono text-cyan-400 flex items-center justify-between">
              <span>Handoff Gate</span>
              <span className="font-bold">STATE RECOVERY TESTED</span>
            </div>
          </div>

          {/* Pillar 4: Scoped MCP & Advisory Locks */}
          <div className="glass-card rounded-2xl p-5 space-y-3 relative group border-emerald-500/20">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                4. Scoped FastMCP Gateway
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Requires single-use HMAC-SHA256 policy tokens. Enforces transaction-scoped advisory locks with zero hash-chain forks.
              </p>
            </div>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] font-mono text-emerald-400 flex items-center justify-between">
              <span>Ledger Protection</span>
              <span className="font-bold">LOCK #884729104</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
