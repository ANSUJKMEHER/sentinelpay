import React from 'react';
import { CheckCircle2, Cpu, RotateCw, Scale, Shield, Sliders } from 'lucide-react';
import { PolicyRule } from '../types';

interface PolicyRulesTabProps {
  rules: PolicyRule[];
  onRefresh: () => void;
}

export const PolicyRulesTab: React.FC<PolicyRulesTabProps> = ({ rules, onRefresh }) => {
  return (
    <div className="space-y-6 py-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight font-sans">
              Deterministic Policy Rules
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
              FAIL-CLOSED ARMED
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-normal">
            Strict mathematical constraints evaluated in pure Python. Signed single-use tokens authorize MCP execution.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 hover:text-white text-xs cursor-pointer transition-colors self-start sm:self-auto"
          title="Refresh Rules"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rules Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-[#0c0d10] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-4.5 space-y-3 relative transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-zinc-200 tracking-wider">
                {rule.rule_code}
              </span>
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-[10px] text-zinc-500">v{rule.version}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20 uppercase">
                  {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-100">{rule.name}</h3>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed font-normal">{rule.description}</p>
            </div>

            <div className="bg-[#111317] rounded-lg p-3 border border-white/[0.04] font-mono text-[11px] space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase font-medium block mb-1 tracking-wider">
                Deterministic Parameters:
              </span>
              <pre className="text-zinc-300 overflow-x-auto text-xs leading-relaxed">
                {JSON.stringify(rule.parameters, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
