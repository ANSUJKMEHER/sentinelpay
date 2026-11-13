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
        <div className="mb-2 p-3 rounded-xl bg-[#0c0d11]/95 backdrop-blur-xl border border-white/[0.06] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 px-1 flex items-center justify-between">
            <span>Command Shortcuts</span>
            <span className="text-[9px] text-zinc-600">ESC or Click + to close</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onRunQuickDemo('auto');
                setShowMenu(false);
              }}
              className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] text-left transition-colors flex items-start space-x-2"
            >
              <Zap className="w-3.5 h-3.5 text-zinc-300 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Auto-Refund Pipeline</span>
                <span className="text-[10px] text-zinc-500">Execute ₹150 claim under pure-Python gate</span>
              </div>
            </button>

            <button
              onClick={() => {
                onRunQuickDemo('high_val');
                setShowMenu(false);
              }}
              className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] text-left transition-colors flex items-start space-x-2"
            >
              <Scale className="w-3.5 h-3.5 text-zinc-300 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">High-Value Escalation</span>
                <span className="text-[10px] text-zinc-500">Escalate ₹25,000 claim to Human HIL</span>
              </div>
            </button>

            <button
              onClick={() => {
                onRunQuickDemo('adversarial');
                setShowMenu(false);
              }}
              className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] text-left transition-colors flex items-start space-x-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-zinc-300 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Adversarial Defense</span>
                <span className="text-[10px] text-zinc-500">Test Cyrillic lookalikes & prompt injections</span>
              </div>
            </button>

            <button
              onClick={() => {
                handleChainClick();
                setShowMenu(false);
              }}
              className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] text-left transition-colors flex items-start space-x-2"
            >
              <Link2 className="w-3.5 h-3.5 text-zinc-300 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Audit Hash Chain</span>
                <span className="text-[10px] text-zinc-500">Verify advisory locks & SHA-256 blocks</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Command Bar (Sleek inspired by Antigravity & User Image 2) */}
      <div className="rounded-xl p-1.5 pl-2 shadow-2xl border border-white/[0.06] bg-[#0c0d10]/95 backdrop-blur-xl flex items-center justify-between gap-2.5">
        {/* Left Action Trigger Pill (+) */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          title="Command Palette"
          className="w-7 h-7 rounded-lg bg-[#1c1e24] hover:bg-[#252830] border border-white/[0.06] flex items-center justify-center text-zinc-300 transition-colors flex-shrink-0 cursor-pointer"
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
            placeholder="Ask anything or type 'auto', 'escalate', 'audit'..."
            className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none font-sans"
          />
        </div>

        {/* Action Shortcut Chips */}
        <div className="hidden sm:flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={() => onRunQuickDemo('auto')}
            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.06] transition-colors flex items-center space-x-1"
          >
            <Zap className="w-2.5 h-2.5 text-zinc-400" />
            <span>Auto</span>
          </button>
          <button
            onClick={() => onRunQuickDemo('high_val')}
            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.06] transition-colors flex items-center space-x-1"
          >
            <Scale className="w-2.5 h-2.5 text-zinc-400" />
            <span>Escalate</span>
          </button>
          <button
            onClick={handleChainClick}
            disabled={isVerifying}
            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.06] transition-colors flex items-center space-x-1"
          >
            <Shield className="w-2.5 h-2.5 text-zinc-400" />
            <span>{isVerifying ? 'Verifying...' : 'Audit'}</span>
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-black/40 border border-white/[0.04] text-[10px] font-mono text-zinc-400 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
          <span className="hidden md:inline">Core v1.0</span>
        </div>
      </div>
    </div>
  );
};
