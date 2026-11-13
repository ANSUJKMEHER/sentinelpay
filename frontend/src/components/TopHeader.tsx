import React from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Plus,
  RefreshCw,
  Shield,
  UserCheck,
} from 'lucide-react';

interface TopHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: string;
  onPersonaChange: (username: string) => void;
  systemHealthy: boolean;
  onRunQuickDemo: (type: 'auto' | 'high_val' | 'adversarial') => void;
  onRefresh: () => void;
  disputesCount?: number;
  approvalsCount?: number;
  txCount?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  onPersonaChange,
  systemHealthy,
  onRunQuickDemo,
  onRefresh,
  disputesCount = 0,
  approvalsCount = 0,
  txCount = 0,
}) => {
  const tabs = [
    { id: 'overview', label: 'Cockpit' },
    { id: 'disputes', label: 'Disputes', count: disputesCount },
    { id: 'approvals', label: 'HIL Queue', count: approvalsCount, highlight: approvalsCount > 0 },
    { id: 'transactions', label: 'Transactions', count: txCount },
    { id: 'audit', label: 'Audit Ledger' },
    { id: 'policy', label: 'Policies' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <header className="border-b border-white/[0.05] bg-[#08090a]/95 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Sleek Navigation Bar */}
        <div className="flex items-center justify-between h-14">
          {/* Left: Minimal Node Tag & Status */}
          <div className="flex items-center space-x-3">
            <span className="font-mono font-medium text-xs tracking-tight text-white">
              SP-NODE-01
            </span>
            <span className="text-zinc-600 text-xs">/</span>
            <div className="flex items-center space-x-1.5 text-[11px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>FAIL-CLOSED ACTIVE</span>
            </div>
            <span className="text-zinc-700 text-xs hidden md:inline">&bull;</span>
            <span className="text-[11px] text-zinc-500 hidden md:inline">
              FastMCP Scoped Settlement
            </span>
          </div>

          {/* Right: Persona & Subtle Action Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              title="Refresh State"
              className="p-1.5 rounded-md hover:bg-white/[0.04] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Persona Switcher */}
            <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-md px-2.5 py-1 text-xs text-zinc-300">
              <span className="text-zinc-500 text-[11px] mr-1.5">Role:</span>
              <select
                className="bg-transparent text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
                value={currentRole}
                onChange={(e) => onPersonaChange(e.target.value)}
              >
                <option value="ops_analyst" className="bg-[#0e1013] text-zinc-200">Ops Analyst</option>
                <option value="risk_lead" className="bg-[#0e1013] text-zinc-200">Risk Lead (Approver)</option>
                <option value="merchant_apex" className="bg-[#0e1013] text-zinc-200">Merchant Apex</option>
                <option value="merchant_quickbite" className="bg-[#0e1013] text-zinc-200">Merchant QuickBite</option>
                <option value="admin" className="bg-[#0e1013] text-zinc-200">FinOps Admin</option>
                <option value="auditor" className="bg-[#0e1013] text-zinc-200">Auditor</option>
              </select>
            </div>

            {/* Subtle High-End Action Button (Monochrome Linear Style) */}
            <button
              onClick={() => onRunQuickDemo('auto')}
              className="px-3 py-1 rounded-md bg-white hover:bg-zinc-200 text-black text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Execute Claim</span>
            </button>
          </div>
        </div>

        {/* Minimal Horizontal Tabs (Subtle Underline Style) */}
        <nav className="flex items-center space-x-4 overflow-x-auto border-t border-white/[0.04] no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 relative cursor-pointer ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                      tab.highlight
                        ? 'bg-amber-500/10 text-amber-400'
                        : isActive
                        ? 'bg-white/[0.08] text-zinc-300'
                        : 'text-zinc-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {/* Clean Active Underline Indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
