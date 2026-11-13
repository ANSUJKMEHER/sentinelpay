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
    <aside className="w-14 h-screen sticky top-0 bg-[#08090c] border-r border-white/[0.07] flex flex-col justify-between items-center py-4 z-40 flex-shrink-0">
      {/* Brand Icon */}
      <div className="flex flex-col items-center space-y-3">
        <button
          onClick={() => setActiveTab('overview')}
          title="SentinelPay Platform"
          className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
        >
          <Shield className="w-4 h-4 text-emerald-400" />
        </button>

        <div className="w-6 h-[1px] bg-white/[0.06]" />

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group flex items-center justify-center">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.1] text-white border border-white/[0.12] shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-gray-400'}`} />

                  {/* Optional Counter Badge */}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Tooltip */}
                <div className="absolute left-14 px-2 py-1 rounded bg-[#0f121a] border border-white/10 text-[11px] font-sans text-gray-200 whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Health Pulse */}
      <div className="flex flex-col items-center">
        <div
          title={systemHealthy ? 'All Systems Healthy' : 'Alert'}
          className="w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center cursor-pointer hover:bg-white/[0.06] transition-colors"
        >
          <span className={`w-2 h-2 rounded-full ${systemHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </div>
      </div>
    </aside>
  );
};
