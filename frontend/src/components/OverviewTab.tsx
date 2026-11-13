import React from 'react';
import {
  Activity,
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
    <div className="space-y-6 py-5 pb-24">
      {/* Sleek Continuous Telemetry Bar (No Heavy Box-in-Box Nesting) */}
      <div className="bg-[#0b0d10] border border-white/[0.05] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-0 sm:divide-x divide-white/[0.04]">
        {/* Metric 1 */}
        <div className="sm:px-4 first:pl-0 space-y-1">
          <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Disputes Ingested
          </div>
          <div className="text-2xl font-semibold text-white font-mono tracking-tight tabular-nums">
            {stats?.disputes.total ?? 0}
          </div>
          <div className="text-[11px] text-zinc-400">
            LangGraph Managed
          </div>
        </div>

        {/* Metric 2 */}
        <div className="sm:px-4 space-y-1">
          <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Auto-Refunded
          </div>
          <div className="text-2xl font-semibold text-emerald-400 font-mono tracking-tight tabular-nums">
            {stats?.disputes.resolved_refunded ?? 0}
          </div>
          <div className="text-[11px] text-zinc-400">
            &le; ₹10k Threshold
          </div>
        </div>

        {/* Metric 3 */}
        <div className="sm:px-4 space-y-1">
          <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            HIL Queue
          </div>
          <div className="text-2xl font-semibold text-amber-400 font-mono tracking-tight tabular-nums">
            {stats?.disputes.pending_human_review ?? 0}
          </div>
          <div className="text-[11px] text-zinc-400">
            Requires Signer
          </div>
        </div>

        {/* Metric 4 */}
        <div className="sm:px-4 space-y-1">
          <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Refund Volume
          </div>
          <div className="text-2xl font-semibold text-white font-mono tracking-tight tabular-nums">
            ₹{(stats?.financial.total_refund_volume ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-zinc-400">
            Settled via MCP
          </div>
        </div>

        {/* Metric 5 */}
        <div className="sm:px-4 space-y-1">
          <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Threats Filtered
          </div>
          <div className="text-2xl font-semibold text-zinc-300 font-mono tracking-tight tabular-nums">
            {stats?.security.threats_blocked ?? 0}
          </div>
          <div className="text-[11px] text-zinc-400">
            Injections & Homoglyphs
          </div>
        </div>

        {/* Metric 6 */}
        <div className="sm:px-4 last:pr-0 space-y-1">
          <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Ledger Hash Chain
          </div>
          <div className="text-xl font-semibold text-emerald-400 font-mono tracking-tight flex items-center space-x-1.5 pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>INTACT</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            Lock #884729104
          </div>
        </div>
      </div>

      {/* Main Content: Pipeline Topology (7 cols) + Queue (5 cols) */}
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

      {/* Secondary Row: Governance Architecture (Monochrome Subtle Cards) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-300">
              Governance Architecture
            </h2>
            <p className="text-[11px] text-zinc-400">
              Four Core Invariants of the SentinelPay FinTech Monolith
            </p>
          </div>
          <button
            onClick={() => onNavigate('policy')}
            className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center space-x-1 font-mono"
          >
            <span>View All Rules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Pillar 1 */}
          <div className="bg-[#0b0d10] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4 space-y-2 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-medium">
                01 // REASONING
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            </div>
            <h3 className="text-xs font-semibold text-white tracking-tight">
              Probabilistic Decoupling
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              LLMs evaluate facts and recommend confidence, but possess zero credentials or tools to move money or modify database balance.
            </p>
            <div className="pt-2 border-t border-white/[0.03] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Financial Movement</span>
              <span className="text-zinc-200">DENIED BY DESIGN</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-[#0b0d10] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4 space-y-2 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-medium">
                02 // POLICY GATE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            </div>
            <h3 className="text-xs font-semibold text-white tracking-tight">
              Pure-Python Decision Engine
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Evaluates hard mathematical bounds (₹10,000 threshold, 60-day window, merchant dispute ratio). Issues HMAC-signed single-use tokens.
            </p>
            <div className="pt-2 border-t border-white/[0.03] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Failure Mode</span>
              <span className="text-emerald-400">FAIL-CLOSED ARMED</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-[#0b0d10] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4 space-y-2 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-medium">
                03 // SUSPENSION
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            </div>
            <h3 className="text-xs font-semibold text-white tracking-tight">
              Persistent Checkpointing
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              High-value transactions suspend execution in persistent PostgreSQL checkpointers until an authorized Risk Lead cryptographically signs off.
            </p>
            <div className="pt-2 border-t border-white/[0.03] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Multi-Process Recovery</span>
              <span className="text-zinc-200">VERIFIED IN CI</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-[#0b0d10] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4 space-y-2 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-medium">
                04 // MCP GATEWAY
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            </div>
            <h3 className="text-xs font-semibold text-white tracking-tight">
              FastMCP Scoped Execution
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Financial tools enforce advisory lock serialization, single-use token consumption, and atomic balance rollbacks with immutable error audits.
            </p>
            <div className="pt-2 border-t border-white/[0.03] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
              <span>PostgreSQL Lock</span>
              <span className="text-zinc-200 font-mono">LOCK #884729104</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
