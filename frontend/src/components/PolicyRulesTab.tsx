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
            <h2 className="text-xl font-extrabold text-white tracking-tight font-mono">
              DETERMINISTIC POLICY RULES
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              FAIL-CLOSED ARMED
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Strict mathematical constraints evaluated in pure Python. Signed single-use tokens authorize MCP execution.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs cursor-pointer transition-all self-start sm:self-auto"
          title="Refresh Rules"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Rules Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="glass-card rounded-2xl p-5 space-y-4 relative border-white/[0.06] hover:border-white/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
                {rule.rule_code}
              </span>
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-[10px] text-gray-500">v{rule.version}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                  {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white font-mono">{rule.name}</h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">{rule.description}</p>
            </div>

            <div className="bg-black/50 rounded-xl p-3.5 border border-white/[0.04] font-mono text-[11px] space-y-1">
              <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">
                Deterministic Parameters:
              </span>
              <pre className="text-emerald-400 overflow-x-auto text-xs leading-relaxed">
                {JSON.stringify(rule.parameters, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
