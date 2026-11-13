import React, { useEffect, useState } from 'react';
import { api } from './api';
import { AntigravityDock } from './components/AntigravityDock';
import { ApprovalQueueTab } from './components/ApprovalQueueTab';
import { AuditLedgerTab } from './components/AuditLedgerTab';
import { DisputesTab } from './components/DisputesTab';
import { OverviewTab } from './components/OverviewTab';
import { PolicyRulesTab } from './components/PolicyRulesTab';
import { SecurityTab } from './components/SecurityTab';
import { SidebarDock } from './components/SidebarDock';
import { TopHeader } from './components/TopHeader';
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

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-[#07080b] flex flex-row font-sans text-gray-100 ambient-mesh relative selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 1. Left Vertical Slim Icon Dock (Inspired by Phenomenon Studio Image 1) */}
      <SidebarDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        systemHealthy={systemHealthy}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <TopHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentRole={currentRole}
          onPersonaChange={handlePersonaChange}
          systemHealthy={systemHealthy}
          onRunQuickDemo={handleRunQuickDemo}
          onRefresh={loadData}
          disputesCount={disputes.length}
          approvalsCount={pendingApprovalsCount}
          txCount={transactions.length}
        />

        {/* Dynamic Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="py-28 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-gray-400 tracking-wider uppercase">
                Initializing SentinelPay Governed FinTech Node...
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  stats={stats}
                  disputes={disputes}
                  transactions={transactions}
                  onNavigate={setActiveTab}
                  onRunQuickDemo={handleRunQuickDemo}
                />
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
                  onFileDispute={() => {
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

        {/* Minimal Bottom Brand Line */}
        <footer className="py-4 text-center text-[10px] font-mono text-gray-600 border-t border-white/[0.04]">
          SentinelPay &bull; ISO-20022 Governed Multi-Agent FinTech Architecture &bull; Fail-Closed Boundary &bull; Advisory Lock Integrity
        </footer>
      </div>

      {/* 3. Antigravity-Style Floating Command Dock (Inspired by Image 2) */}
      <AntigravityDock
        onRunQuickDemo={handleRunQuickDemo}
        onNavigate={setActiveTab}
        onVerifyChain={handleVerifyChain}
      />
    </div>
  );
}

export default App;
