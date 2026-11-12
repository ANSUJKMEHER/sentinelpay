import React from 'react';
import { CheckCircle2, RotateCw, Scale, Shield, Sliders } from 'lucide-react';
import { PolicyRule } from '../types';

interface PolicyRulesTabProps {
  rules: PolicyRule[];
  onRefresh: () => void;
}

export const PolicyRulesTab: React.FC<PolicyRulesTabProps> = ({ rules, onRefresh }) => {
  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Deterministic Policy Engine Rules</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CONFIGURABLE & VERSIONED
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Hard mathematical limits evaluated in pure Python. The policy engine fails closed if unreachable.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 text-xs cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-emerald-400">{rule.rule_code}</span>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-500 font-mono">v{rule.version}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">{rule.name}</h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">{rule.description}</p>
            </div>

            <div className="bg-gray-950/80 rounded-lg p-3 border border-gray-800/80 font-mono text-[11px] space-y-1">
              <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Configured Parameters:</span>
              <pre className="text-emerald-300 overflow-x-auto">{JSON.stringify(rule.parameters, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
