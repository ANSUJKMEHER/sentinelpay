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
    { id: 'disputes', label: 'Disputes & Claims', count: disputesCount },
    { id: 'approvals', label: 'Human Queue', count: approvalsCount, highlight: approvalsCount > 0 },
    { id: 'transactions', label: 'Transactions', count: txCount },
    { id: 'audit', label: 'Audit Ledger' },
    { id: 'policy', label: 'Policy Engine' },
    { id: 'security', label: 'Adversarial Shield' },
  ];

  return (
    <header className="border-b border-white/[0.06] bg-[#090b10]/90 backdrop-blur-2xl sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-20 py-2">
          {/* Left: Monospace Node Identity (Inspired by TX-9913-HX) */}
          <div className="flex items-center space-x-4">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2.5">
                <span className="text-xl font-extrabold tracking-wider text-white font-mono">
                  SP-NODE-PROD-01
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>POLICY ARMED</span>
                </span>
              </div>
              <p className="text-xs text-gray-400">
                SentinelPay Governed FinTech &bull; Multi-Tenant Isolated &bull; Pure Python Boundary
              </p>
            </div>
          </div>

          {/* Right Action Stack: Fail-Closed Toggle, Persona, & Glowing CTA */}
          <div className="flex items-center space-x-3">
            {/* Live Refresh Trigger */}
            <button
              onClick={onRefresh}
              title="Refresh Platform State"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Persona Selector (Capsule) */}
            <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-gray-200">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-gray-400 hidden sm:inline">Role:</span>
              <select
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
                value={currentRole}
                onChange={(e) => onPersonaChange(e.target.value)}
              >
                <option value="ops_analyst" className="bg-[#0f121a] text-white">Ops Analyst</option>
                <option value="risk_lead" className="bg-[#0f121a] text-white">Risk Lead (Approver)</option>
                <option value="merchant_apex" className="bg-[#0f121a] text-white">Merchant Apex (Isolated)</option>
                <option value="merchant_quickbite" className="bg-[#0f121a] text-white">Merchant QuickBite</option>
                <option value="admin" className="bg-[#0f121a] text-white">FinOps Admin</option>
                <option value="auditor" className="bg-[#0f121a] text-white">Auditor (Read-Only)</option>
              </select>
            </div>

            {/* Glowing CTA Button (Inspired by Activate Route in Image 1!) */}
            <button
              onClick={() => onRunQuickDemo('auto')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 flex items-center space-x-2 cursor-pointer transform hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Execute Claim Workflow</span>
            </button>
          </div>
        </div>

        {/* Sub-Header Horizontal Tab Navigation */}
        <nav className="flex items-center space-x-2 overflow-x-auto py-2.5 border-t border-white/[0.04] no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center space-x-2 cursor-pointer ${
                  isActive
                    ? 'bg-white/[0.1] text-white border border-white/[0.15] shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      tab.highlight
                        ? 'bg-amber-500 text-black font-bold'
                        : isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/[0.06] text-gray-400'
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
