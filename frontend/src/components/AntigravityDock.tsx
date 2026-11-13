import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Command,
  HelpCircle,
  Link2,
  Plus,
  Scale,
  Search,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AntigravityDockProps {
  onRunQuickDemo: (type: 'auto' | 'high_val' | 'adversarial') => void;
  onNavigate: (tab: string) => void;
  onVerifyChain: () => Promise<any>;
}

export const AntigravityDock: React.FC<AntigravityDockProps> = ({
  onRunQuickDemo,
  onNavigate,
  onVerifyChain,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputVal.trim()) {
      const q = inputVal.toLowerCase();
      if (q.includes('auto') || q.includes('refund')) {
        onRunQuickDemo('auto');
      } else if (q.includes('high') || q.includes('escalat') || q.includes('approval')) {
        onRunQuickDemo('high_val');
      } else if (q.includes('inject') || q.includes('adversar') || q.includes('security')) {
        onRunQuickDemo('adversarial');
      } else if (q.includes('chain') || q.includes('audit')) {
        onNavigate('audit');
      } else if (q.includes('dispute')) {
        onNavigate('disputes');
      } else {
        onNavigate('overview');
      }
      setInputVal('');
    }
  };

  const handleChainClick = async () => {
    setIsVerifying(true);
    try {
      await onVerifyChain();
      onNavigate('audit');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-auto">
      {/* Quick Menu Popover */}
      {showMenu && (
        <div className="mb-2 p-3 rounded-2xl bg-[#12151f]/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="text-[11px] font-mono text-gray-400 uppercase mb-2 px-2 flex items-center justify-between">
            <span>Antigravity Quick Actions</span>
            <span>ESC to close</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onRunQuickDemo('auto');
                setShowMenu(false);
              }}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-left transition-all group flex items-start space-x-2.5"
            >
              <Zap className="w-4 h-4 text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-semibold text-white block">Auto-Refund Pipeline</span>
                <span className="text-[10px] text-gray-400">Process ₹150 claim under pure-Python gate</span>
              </div>
            </button>

            <button
              onClick={() => {
                onRunQuickDemo('high_val');
                setShowMenu(false);
              }}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 border border-white/[0.06] hover:border-indigo-500/30 text-left transition-all group flex items-start space-x-2.5"
            >
              <Scale className="w-4 h-4 text-indigo-400 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-semibold text-white block">High-Value Escalation</span>
                <span className="text-[10px] text-gray-400">Escalate ₹25,000 claim to Human Approval</span>
              </div>
            </button>

            <button
              onClick={() => {
                onRunQuickDemo('adversarial');
                setShowMenu(false);
              }}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/30 text-left transition-all group flex items-start space-x-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-semibold text-white block">Adversarial Defense</span>
                <span className="text-[10px] text-gray-400">Test Cyrillic lookalikes & prompt injections</span>
              </div>
            </button>

            <button
              onClick={() => {
                handleChainClick();
                setShowMenu(false);
              }}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/[0.06] hover:border-cyan-500/30 text-left transition-all group flex items-start space-x-2.5"
            >
              <Link2 className="w-4 h-4 text-cyan-400 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-semibold text-white block">Cryptographic Audit Ledger</span>
                <span className="text-[10px] text-gray-400">Verify advisory locks & SHA-256 hash-chain</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Antigravity Sleek Pill Container */}
      <div className="glass-panel rounded-full p-2 pl-3 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/[0.12] bg-[#0c0e14]/90 flex items-center justify-between gap-3">
        {/* Left Circular + Trigger Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          title="Quick Action Palette"
          className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/[0.1] flex items-center justify-center text-gray-200 transition-all duration-300 hover:rotate-90 flex-shrink-0 cursor-pointer shadow-inner"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Input Bar */}
        <div className="flex-1 flex items-center space-x-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask SentinelPay or type 'auto', 'escalate', 'security'..."
            className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none font-sans"
          />
        </div>

        {/* Action Shortcut Chips */}
        <div className="hidden sm:flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={() => onRunQuickDemo('auto')}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center space-x-1"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Auto</span>
          </button>
          <button
            onClick={() => onRunQuickDemo('high_val')}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center space-x-1"
          >
            <Scale className="w-3 h-3 text-indigo-400" />
            <span>Escalate</span>
          </button>
          <button
            onClick={handleChainClick}
            disabled={isVerifying}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center space-x-1"
          >
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>{isVerifying ? 'Verifying...' : 'Audit'}</span>
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/[0.06] text-[10px] font-mono text-gray-400 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden md:inline">Core v1.0</span>
        </div>
      </div>
    </div>
  );
};
