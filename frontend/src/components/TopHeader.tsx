import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Zap,
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
    { id: 'security', label: 'Security Shield' },
  ];

  return (
    <header className="border-b border-white/[0.07] bg-[#08090c]/90 backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Bar (Engineered Density) */}
        <div className="flex items-center justify-between h-16">
          {/* Left: Node Identity */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="font-mono font-semibold text-sm tracking-tight text-white">
                SP-NODE-01
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>FAIL-CLOSED ARMED</span>
              </span>
            </div>
            <span className="text-gray-600 hidden md:inline text-xs">&bull;</span>
            <span className="text-[11px] text-gray-400 hidden md:inline font-sans">
              Deterministic Governance &bull; Scoped FastMCP Gateway
            </span>
          </div>

          {/* Right Action Stack */}
          <div className="flex items-center space-x-2.5">
            {/* Live Refresh Trigger */}
            <button
              onClick={onRefresh}
              title="Refresh State"
              className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Persona Selector */}
            <div className="flex items-center space-x-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-gray-300">
              <UserCheck className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400 text-[11px] font-medium hidden sm:inline">Role:</span>
              <select
                className="bg-transparent text-gray-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
                value={currentRole}
                onChange={(e) => onPersonaChange(e.target.value)}
              >
                <option value="ops_analyst" className="bg-[#0e1017] text-white">Ops Analyst</option>
                <option value="risk_lead" className="bg-[#0e1017] text-white">Risk Lead (Approver)</option>
                <option value="merchant_apex" className="bg-[#0e1017] text-white">Merchant Apex (Isolated)</option>
                <option value="merchant_quickbite" className="bg-[#0e1017] text-white">Merchant QuickBite</option>
                <option value="admin" className="bg-[#0e1017] text-white">FinOps Admin</option>
                <option value="auditor" className="bg-[#0e1017] text-white">Auditor (Read-Only)</option>
              </select>
            </div>

            {/* Professional Primary Action Button (Restrained, High-Contrast) */}
            <button
              onClick={() => onRunQuickDemo('auto')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Execute Claim</span>
            </button>
          </div>
        </div>

        {/* Sub-Header Horizontal Tab Navigation */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-2 border-t border-white/[0.04] no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/[0.12] shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                      tab.highlight
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                        : isActive
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-white/[0.04] text-gray-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
