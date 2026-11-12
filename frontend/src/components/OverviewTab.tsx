import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck2,
  Lock,
  Scale,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SystemStats } from '../types';

interface OverviewTabProps {
  stats: SystemStats | null;
  onNavigate: (tab: string) => void;
  onRunQuickDemo: (type: 'auto' | 'high_val' | 'adversarial') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats, onNavigate, onRunQuickDemo }) => {
  return (
    <div className="space-y-8 py-6">
      {/* Platform Banner */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-[#101726] to-gray-900 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-Trust FinTech Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Autonomous Financial Operations with Deterministic Policy Governance
          </h1>
          <p className="text-sm text-gray-300 leading-relaxed">
            SentinelPay orchestrates multi-agent dispute investigations with LangGraph while strictly decoupling 
            probabilistic LLM reasoning from financial movement. No funds can move without passing through the pure-Python 
            deterministic policy engine and short-lived signed MCP execution tokens.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onRunQuickDemo('auto')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Run Auto-Refund Dispute (&le; ₹10k)</span>
            </button>
            <button
              onClick={() => onRunQuickDemo('high_val')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              <span>Run High-Value Escalation (&gt; ₹10k)</span>
            </button>
            <button
              onClick={() => onRunQuickDemo('adversarial')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Test Prompt Injection Defense</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Total Disputes</span>
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.disputes.total ?? 0}</div>
          <p className="text-[11px] text-gray-500">Ingested & Triaged</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Auto-Refunded</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats?.disputes.resolved_refunded ?? 0}</div>
          <p className="text-[11px] text-gray-500">Passed Policy Engine</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Human Queue</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats?.disputes.pending_human_review ?? 0}</div>
          <p className="text-[11px] text-gray-500">HIL Escalations</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Rejected</span>
            <Scale className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-300">{stats?.disputes.resolved_rejected ?? 0}</div>
          <p className="text-[11px] text-gray-500">Failed Policy / Window</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Refund Volume</span>
            <Coins className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-teal-400">₹{(stats?.financial.total_refund_volume ?? 0).toLocaleString()}</div>
          <p className="text-[11px] text-gray-500">Sandbox Ledger</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Threats Blocked</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{stats?.security.threats_blocked ?? 0}</div>
          <p className="text-[11px] text-gray-500">Adversarial Injections</p>
        </div>
      </div>

      {/* The 4 Core Architectural Pillars */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Governance Architecture Breakdown</h2>
          <span className="text-xs text-gray-400">How SentinelPay guarantees financial transaction safety</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Pillar 1 */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Pillar 1</span>
                <h3 className="text-sm font-bold text-white">AI Agents (Probabilistic)</h3>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              LangGraph multi-agent coordination. Reads documents, synthesizes evidence, classifies claims, and produces structured recommendations.
            </p>
            <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-500/20">
              Authority: ADVISORY ONLY
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Pillar 2</span>
                <h3 className="text-sm font-bold text-white">Policy Engine (Deterministic)</h3>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Zero-LLM pure Python rule engine. Evaluates spending limits (&le; ₹10,000), 60-day windows, duplicate idempotency keys, and merchant risk.
            </p>
            <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/20">
              Authority: HARD BINARY GATE (FAIL-CLOSED)
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pillar 3</span>
                <h3 className="text-sm font-bold text-white">Human Approval (HIL)</h3>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              State graph checkpoint interruption. Disputes exceeding ₹10,000 or from flagged accounts strictly require signed Risk Lead authorization.
            </p>
            <div className="text-[11px] font-mono text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-500/20">
              Authority: ROLE-SCOPED SIGN-OFF
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="rounded-xl border border-teal-500/20 bg-teal-950/20 p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Pillar 4</span>
                <h3 className="text-sm font-bold text-white">MCP Financial Gateway</h3>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Sandboxed financial execution server. Rejects any execution request without a cryptographically signed PolicyToken with short TTL (&le; 60s).
            </p>
            <div className="text-[11px] font-mono text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded border border-teal-500/20">
              Authority: CRYPTOGRAPHICALLY SIGNED MCP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
