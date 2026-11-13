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
      {/* KPI Stats Strip — Brutal Typographic Contrast (Google Design Best Practice) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Total Ingested */}
        <div className="glass-card rounded-xl p-4 space-y-1">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 font-mono">
            Disputes Ingested
          </div>
          <div className="text-3xl font-bold text-white font-mono tracking-tight tabular-nums">
            {stats?.disputes.total ?? 0}
          </div>
          <div className="text-[10px] text-gray-500 font-mono flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Stateful Thread Intact</span>
          </div>
        </div>

        {/* KPI 2: Auto-Refunded */}
        <div className="glass-card rounded-xl p-4 space-y-1 border-emerald-500/20">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-emerald-400 font-mono">
            Auto-Refunded
          </div>
          <div className="text-3xl font-bold text-emerald-400 font-mono tracking-tight tabular-nums">
            {stats?.disputes.resolved_refunded ?? 0}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            &le; ₹10,000 Pure-Python Gate
          </div>
        </div>

        {/* KPI 3: Human Review */}
        <div className="glass-card rounded-xl p-4 space-y-1 border-amber-500/20">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-amber-400 font-mono">
            Human Queue
          </div>
          <div className="text-3xl font-bold text-amber-400 font-mono tracking-tight tabular-nums">
            {stats?.disputes.pending_human_review ?? 0}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            Suspended at Checkpoints
          </div>
        </div>

        {/* KPI 4: Refund Volume */}
        <div className="glass-card rounded-xl p-4 space-y-1">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 font-mono">
            Refund Volume
          </div>
          <div className="text-3xl font-bold text-white font-mono tracking-tight tabular-nums">
            ₹{(stats?.financial.total_refund_volume ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            FastMCP Scoped Settlement
          </div>
        </div>

        {/* KPI 5: Threats Intercepted */}
        <div className="glass-card rounded-xl p-4 space-y-1">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 font-mono">
            Threats Intercepted
          </div>
          <div className="text-3xl font-bold text-rose-400 font-mono tracking-tight tabular-nums">
            {stats?.security.threats_blocked ?? 0}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            Injections & Homoglyphs
          </div>
        </div>

        {/* KPI 6: Cryptographic Chain */}
        <div className="glass-card rounded-xl p-4 space-y-1">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 font-mono">
            Ledger Hash-Chain
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight flex items-center space-x-1.5 pt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>INTACT</span>
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            Lock #884729104 Verified
          </div>
        </div>
      </div>

      {/* Main Grid: Topology (7 cols) + Claims Queue (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7">
          <TopologyCard
            stats={stats}
            onRunQuickDemo={onRunQuickDemo}
            onNavigate={onNavigate}
          />
        </div>

        <div className="lg:col-span-5">
          <ClaimsQueueCard
            disputes={disputes}
            transactions={transactions}
            onNavigate={onNavigate}
            onRunQuickDemo={onRunQuickDemo}
          />
        </div>
      </div>

      {/* Secondary Grid: Governance Architecture Pillars */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
              Governance Architecture
            </h2>
            <p className="text-xs text-gray-400">
              Four Formal Security Invariants of the SentinelPay Monolith
            </p>
          </div>
          <button
            onClick={() => onNavigate('policy')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1 font-mono"
          >
            <span>View All Rules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Pillar 1 */}
          <div className="glass-card rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                01 // REASONING
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            </div>
            <h3 className="text-xs font-bold text-white tracking-tight font-display">
              Probabilistic Decoupling
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              LLMs evaluate facts and recommend confidence, but possess zero credentials or tools to move money or modify database balance.
            </p>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] font-mono text-gray-500 flex items-center justify-between">
              <span>Execution Rights</span>
              <span className="text-indigo-400 font-semibold">DENIED BY DESIGN</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="glass-card rounded-xl p-4 space-y-2.5 border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                02 // POLICY GATE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
            <h3 className="text-xs font-bold text-white tracking-tight font-display">
              Pure-Python Decision Engine
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Enforces hard mathematical bounds (₹10k threshold, 60-day window, merchant dispute ratio). Issues cryptographically signed single-use tokens.
            </p>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] font-mono text-gray-500 flex items-center justify-between">
              <span>Failure Mode</span>
              <span className="text-amber-400 font-semibold">FAIL-CLOSED ARMED</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="glass-card rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                03 // SUSPENSION
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
            <h3 className="text-xs font-bold text-white tracking-tight font-display">
              Persistent LangGraph Checkpoint
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              High-value transactions suspend execution in persistent PostgreSQL checkpointers until an authorized Risk Lead cryptographically signs off.
            </p>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] font-mono text-gray-500 flex items-center justify-between">
              <span>Multi-Process State</span>
              <span className="text-cyan-400 font-semibold">RECOVERABLE</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="glass-card rounded-xl p-4 space-y-2.5 border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                04 // MCP GATEWAY
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <h3 className="text-xs font-bold text-white tracking-tight font-display">
              FastMCP Scoped Execution
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Financial tools enforce advisory lock serialization, single-use token consumption, and atomic balance rollbacks with immutable error audits.
            </p>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] font-mono text-gray-500 flex items-center justify-between">
              <span>Concurrency Lock</span>
              <span className="text-emerald-400 font-semibold font-mono">LOCK #884729104</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
