import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, Lock } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: string;
  onPersonaChange: (username: string) => void;
  systemHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  onPersonaChange,
  systemHealthy,
}) => {
  const tabs = [
    { id: 'overview', label: 'Operations Cockpit' },
    { id: 'disputes', label: 'Disputes & Investigation' },
    { id: 'approvals', label: 'Human Approval Queue' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'audit', label: 'Audit & Cryptographic Ledger' },
    { id: 'policy', label: 'Deterministic Policies' },
    { id: 'security', label: 'Security & Adversarial Shield' },
  ];

  return (
    <header className="border-b border-gray-800 bg-[#0d121d]/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">Sentinel<span className="text-emerald-400">Pay</span></span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  GOVERNED AGENTIC FINTECH
                </span>
              </div>
              <p className="text-xs text-gray-400">Deterministic Policy Gated FinTech Orchestration</p>
            </div>
          </div>

          {/* Status Indicators & Persona Switcher */}
          <div className="flex items-center space-x-4">
            {/* Fail-Closed System Health */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-900 border border-gray-800">
              <span className={`w-2 h-2 rounded-full ${systemHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-gray-300">Policy Fail-Closed:</span>
              <span className="text-emerald-400 font-semibold">ACTIVE</span>
            </div>

            {/* Persona Switcher */}
            <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 rounded-lg p-1 text-xs">
              <UserCheck className="w-4 h-4 text-gray-400 ml-1" />
              <span className="text-gray-400 hidden sm:inline">Role:</span>
              <select
                className="bg-transparent text-gray-200 font-medium focus:outline-none cursor-pointer pr-2"
                value={currentRole}
                onChange={(e) => onPersonaChange(e.target.value)}
              >
                <option value="ops_analyst" className="bg-gray-900 text-gray-100">Ops Analyst (General)</option>
                <option value="risk_lead" className="bg-gray-900 text-gray-100">Risk Lead (Approver)</option>
                <option value="merchant_apex" className="bg-gray-900 text-gray-100">Merchant Apex (Isolated)</option>
                <option value="merchant_quickbite" className="bg-gray-900 text-gray-100">Merchant QuickBite</option>
                <option value="admin" className="bg-gray-900 text-gray-100">FinOps Admin (Superuser)</option>
                <option value="auditor" className="bg-gray-900 text-gray-100">Auditor (Read-Only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-gray-800/60 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
