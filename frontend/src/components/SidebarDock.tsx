import React from 'react';
import {
  AlertTriangle,
  Cpu,
  Layers,
  LayoutDashboard,
  Link2,
  Lock,
  Receipt,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface SidebarDockProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalsCount?: number;
  systemHealthy?: boolean;
}

export const SidebarDock: React.FC<SidebarDockProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount = 0,
  systemHealthy = true,
}) => {
  const navItems = [
    { id: 'overview', label: 'Operations Cockpit', icon: LayoutDashboard },
    { id: 'disputes', label: 'Disputes & Claims', icon: Scale },
    {
      id: 'approvals',
      label: 'Human Approval Queue',
      icon: UserCheck,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: 'transactions', label: 'Transactions Ledger', icon: Receipt },
    { id: 'audit', label: 'Cryptographic Ledger', icon: ShieldCheck },
    { id: 'policy', label: 'Deterministic Policies', icon: Cpu },
    { id: 'security', label: 'Adversarial Shield', icon: ShieldAlert },
  ];

  return (
    <aside className="w-16 h-screen sticky top-0 bg-[#080a0f]/95 backdrop-blur-2xl border-r border-white/[0.06] flex flex-col justify-between items-center py-5 z-40 flex-shrink-0">
      {/* Brand Icon Shield */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={() => setActiveTab('overview')}
          title="SentinelPay Platform"
          className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-glow-emerald hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
        >
          <div className="w-full h-full bg-[#0a0c12] rounded-2xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
        </button>

        <div className="w-8 h-[1px] bg-white/[0.06]" />

        {/* Navigation Item Stack */}
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group flex items-center justify-center">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 relative cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-b from-white/[0.12] to-white/[0.04] text-emerald-400 border border-white/[0.15] shadow-lg shadow-black/40'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-gray-400'}`} />

                  {/* Optional Counter Badge */}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center font-mono">
                      {item.badge}
                    </span>
                  )}

                  {/* Active Indicator Bar on Left */}
                  {isActive && (
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-400 rounded-r-full shadow-glow-emerald" />
                  )}
                </button>

                {/* Tooltip on Hover */}
                <div className="absolute left-16 px-2.5 py-1 rounded-lg bg-gray-900/95 border border-white/10 text-xs text-white whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 font-medium">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Health Pulse */}
      <div className="flex flex-col items-center space-y-3">
        <div
          title={systemHealthy ? 'System Health: 100% (PostgreSQL, Redis & MCP Online)' : 'System Alert'}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center cursor-pointer hover:bg-white/[0.08] transition-all"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${systemHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </div>
      </div>
    </aside>
  );
};
