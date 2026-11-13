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
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 pointer-events-auto">
      {/* Quick Menu Popover */}
      {showMenu && (
        <div className="mb-2 p-3 rounded-2xl bg-[#0e1017]/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1 flex items-center justify-between">
            <span>Command Shortcuts</span>
            <span>ESC to dismiss</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onRunQuickDemo('auto');
                setShowMenu(false);
              }}
              className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/25 text-left transition-all flex items-start space-x-2"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-white block">Auto-Refund Pipeline</span>
                <span className="text-[10px] text-gray-400">Execute ₹150 claim under pure-Python gate</span>
              </div>
            </button>

            <button
              onClick={() => {
                onRunQuickDemo('high_val');
                setShowMenu(false);
              }}
              className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-indigo-500/10 border border-white/[0.06] hover:border-indigo-500/25 text-left transition-all flex items-start space-x-2"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-400 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-white block">High-Value Escalation</span>
                <span className="text-[10px] text-gray-400">Escalate ₹25,000 claim to Human HIL</span>
              </div>
            </button>

            <button
              onClick={() => {
                onRunQuickDemo('adversarial');
                setShowMenu(false);
              }}
              className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/25 text-left transition-all flex items-start space-x-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5" />
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
              className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-cyan-500/10 border border-white/[0.06] hover:border-cyan-500/25 text-left transition-all flex items-start space-x-2"
            >
              <Link2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-white block">Audit Hash Chain</span>
                <span className="text-[10px] text-gray-400">Verify advisory locks & SHA-256 blocks</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Command Bar */}
      <div className="glass-panel rounded-xl p-1.5 pl-2.5 shadow-2xl border border-white/[0.1] bg-[#0c0e14]/95 flex items-center justify-between gap-2.5">
        {/* Left Action Trigger */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          title="Command Palette (Cmd+K)"
          className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-gray-300 transition-all flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Search / Command Input */}
        <div className="flex-1 flex items-center space-x-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type 'auto', 'escalate', 'audit'..."
            className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none font-sans"
          />
        </div>

        {/* Action Shortcut Chips */}
        <div className="hidden sm:flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={() => onRunQuickDemo('auto')}
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition-colors flex items-center space-x-1"
          >
            <Zap className="w-2.5 h-2.5 text-emerald-400" />
            <span>Auto</span>
          </button>
          <button
            onClick={() => onRunQuickDemo('high_val')}
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 transition-colors flex items-center space-x-1"
          >
            <Scale className="w-2.5 h-2.5 text-indigo-400" />
            <span>Escalate</span>
          </button>
          <button
            onClick={handleChainClick}
            disabled={isVerifying}
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 transition-colors flex items-center space-x-1"
          >
            <Shield className="w-2.5 h-2.5 text-cyan-400" />
            <span>{isVerifying ? 'Verifying...' : 'Audit'}</span>
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-black/40 border border-white/[0.06] text-[10px] font-mono text-gray-400 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden md:inline">Core v1.0</span>
        </div>
      </div>
    </div>
  );
};
