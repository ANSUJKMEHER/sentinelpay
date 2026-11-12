import {
  ApprovalItem,
  AuditLogItem,
  Dispute,
  PolicyRule,
  SystemStats,
  TimelineEntry,
  Transaction,
} from './types';

const API_BASE = '/api/v1';

let authToken: string = '';

export function setAuthToken(token: string) {
  authToken = token;
}

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

export const api = {
  // Auth
  async login(username: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Login failed');
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  async getHealth() {
    const res = await fetch(`${API_BASE}/health`, { headers: getHeaders() });
    return res.json();
  },

  async getStats(): Promise<SystemStats> {
    const res = await fetch(`${API_BASE}/audit/stats`, { headers: getHeaders() });
    return res.json();
  },

  // Transactions
  async getTransactions(merchantId?: string): Promise<Transaction[]> {
    const url = merchantId ? `${API_BASE}/transactions?merchant_id=${merchantId}` : `${API_BASE}/transactions`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch transactions');
    return res.json();
  },

  // Disputes
  async getDisputes(status?: string): Promise<Dispute[]> {
    const url = status ? `${API_BASE}/disputes?status=${status}` : `${API_BASE}/disputes`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch disputes');
    return res.json();
  },

  async getDispute(id: string): Promise<Dispute> {
    const res = await fetch(`${API_BASE}/disputes/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch dispute');
    return res.json();
  },

  async createDispute(payload: {
    transaction_id: string;
    dispute_type: string;
    disputed_amount: number;
    claim_reason: string;
  }): Promise<Dispute> {
    const res = await fetch(`${API_BASE}/disputes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to file dispute');
    return res.json();
  },

  async triggerInvestigation(disputeId: string): Promise<{
    dispute_id: string;
    status: string;
    current_stage: string;
    policy_verdict: string;
    ai_recommendation: string;
    human_required: boolean;
    timeline: TimelineEntry[];
    execution_result: any;
    errors: string[];
  }> {
    const res = await fetch(`${API_BASE}/disputes/${disputeId}/investigate`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Investigation failed');
    return res.json();
  },

  // Approvals
  async getPendingApprovals(): Promise<ApprovalItem[]> {
    const res = await fetch(`${API_BASE}/approvals`, { headers: getHeaders() });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch approvals');
    return res.json();
  },

  async resolveApproval(approvalId: string, action: 'APPROVE' | 'REJECT', reviewNotes: string) {
    const res = await fetch(`${API_BASE}/approvals/${approvalId}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action, review_notes: reviewNotes }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to resolve approval');
    return res.json();
  },

  // Audit
  async getAuditLogs(limit: number = 30): Promise<{
    is_chain_intact: boolean;
    tamper_detected: boolean;
    tamper_details?: string;
    logs: AuditLogItem[];
  }> {
    const res = await fetch(`${API_BASE}/audit/logs?limit=${limit}`, { headers: getHeaders() });
    return res.json();
  },

  async verifyAuditChain(): Promise<{
    chain_intact: boolean;
    total_records_verified: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/audit/verify`, { headers: getHeaders() });
    return res.json();
  },

  // Policy
  async getPolicyRules(): Promise<PolicyRule[]> {
    const res = await fetch(`${API_BASE}/policy/rules`, { headers: getHeaders() });
    return res.json();
  },
};
