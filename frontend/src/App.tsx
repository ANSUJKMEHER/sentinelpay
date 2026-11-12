import React, { useEffect, useState } from 'react';
import { api } from './api';
import { ApprovalQueueTab } from './components/ApprovalQueueTab';
import { AuditLedgerTab } from './components/AuditLedgerTab';
import { DisputesTab } from './components/DisputesTab';
import { Navbar } from './components/Navbar';
import { OverviewTab } from './components/OverviewTab';
import { PolicyRulesTab } from './components/PolicyRulesTab';
import { SecurityTab } from './components/SecurityTab';
import { TransactionsTab } from './components/TransactionsTab';
import {
  ApprovalItem,
  AuditLogItem,
  Dispute,
  PolicyRule,
  SystemStats,
  Transaction,
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentRole, setCurrentRole] = useState('ops_analyst');
  const [systemHealthy, setSystemHealthy] = useState(true);

  // Data state
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isChainIntact, setIsChainIntact] = useState(true);
  const [policyRules, setPolicyRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [statsRes, txRes, dispRes, apprRes, auditRes, rulesRes] = await Promise.all([
        api.getStats().catch(() => null),
        api.getTransactions().catch(() => []),
        api.getDisputes().catch(() => []),
        api.getPendingApprovals().catch(() => []),
        api.getAuditLogs().catch(() => ({ is_chain_intact: true, logs: [] })),
        api.getPolicyRules().catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      setTransactions(txRes);
      setDisputes(dispRes);
      setApprovals(apprRes);
      if (auditRes) {
        setAuditLogs(auditRes.logs || []);
        setIsChainIntact(auditRes.is_chain_intact);
      }
      setPolicyRules(rulesRes);
    } catch (err) {
      console.error('Failed to load SentinelPay state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial login as Ops Analyst
    api.login('ops_analyst').then(() => {
      loadData();
    });
  }, []);

  const handlePersonaChange = async (username: string) => {
    setCurrentRole(username);
    await api.login(username);
    await loadData();
  };

  const handleTriggerInvestigation = async (disputeId: string) => {
    const res = await api.triggerInvestigation(disputeId);
    await loadData();
    return res;
  };

  const handleCreateDispute = async (payload: {
    transaction_id: string;
    dispute_type: string;
    disputed_amount: number;
    claim_reason: string;
  }) => {
    const res = await api.createDispute(payload);
    await loadData();
    return res;
  };

  const handleResolveApproval = async (approvalId: string, action: 'APPROVE' | 'REJECT', notes: string) => {
    const res = await api.resolveApproval(approvalId, action, notes);
    await loadData();
    return res;
  };

  const handleVerifyChain = async () => {
    const res = await api.verifyAuditChain();
    await loadData();
    return res;
  };

  const handleRunQuickDemo = async (type: 'auto' | 'high_val' | 'adversarial') => {
    try {
      if (type === 'auto') {
        const d = await api.createDispute({
          transaction_id: 'txn_1001',
          dispute_type: 'goods_not_received',
          disputed_amount: 150.0,
          claim_reason: 'Automated Demo: Customer reported meal box not delivered. Eligible for auto-refund.',
        });
        await api.triggerInvestigation(d.id);
        setActiveTab('disputes');
      } else if (type === 'high_val') {
        const d = await api.createDispute({
          transaction_id: 'txn_1002',
          dispute_type: 'defective_item',
          disputed_amount: 25000.0,
          claim_reason: 'High-Value Demo: Luxury chronograph bezel damaged. Exceeds ₹10,000 threshold.',
        });
        await api.triggerInvestigation(d.id);
        setActiveTab('approvals');
      } else if (type === 'adversarial') {
        setActiveTab('security');
      }
      await loadData();
    } catch (err: any) {
      alert(`Demo execution error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        onPersonaChange={handlePersonaChange}
        systemHealthy={systemHealthy}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="py-20 text-center text-gray-500 text-xs">
            Connecting to SentinelPay Governed FinTech Node...
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab stats={stats} onNavigate={setActiveTab} onRunQuickDemo={handleRunQuickDemo} />
            )}
            {activeTab === 'disputes' && (
              <DisputesTab
                disputes={disputes}
                transactions={transactions}
                onTriggerInvestigation={handleTriggerInvestigation}
                onCreateDispute={handleCreateDispute}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'approvals' && (
              <ApprovalQueueTab
                approvals={approvals}
                currentRole={currentRole}
                onResolveApproval={handleResolveApproval}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsTab
                transactions={transactions}
                onFileDispute={(tx) => {
                  setActiveTab('disputes');
                }}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'audit' && (
              <AuditLedgerTab
                logs={auditLogs}
                isChainIntact={isChainIntact}
                onVerifyChain={handleVerifyChain}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'policy' && <PolicyRulesTab rules={policyRules} onRefresh={loadData} />}
            {activeTab === 'security' && <SecurityTab />}
          </>
        )}
      </main>

      <footer className="border-t border-gray-800/80 bg-gray-950 py-4 text-center text-[11px] text-gray-500">
        <p>SentinelPay &copy; 2026 &bull; Enterprise-Grade Governed Agentic FinTech Platform &bull; Fail-Closed Policy Engine &bull; Independent MCP Gateway</p>
      </footer>
    </div>
  );
}

export default App;
