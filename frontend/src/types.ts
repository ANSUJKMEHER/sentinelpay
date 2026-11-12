export interface Transaction {
  id: string;
  merchant_id: string;
  account_id: string;
  customer_id?: string;
  customer_email?: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  refunded_amount: number;
  eligible_refund_balance: number;
  idempotency_key: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  merchant_id: string;
  dispute_type: string;
  disputed_amount: number;
  status: string;
  current_stage: string;
  ai_confidence?: number;
  ai_recommendation?: string;
  policy_verdict?: string;
  policy_reason?: string;
  human_required: boolean;
  final_resolution?: string;
  created_at: string;
  updated_at: string;
  evidence?: EvidenceItem[];
}

export interface EvidenceItem {
  id: string;
  document_type: string;
  filename: string;
  authenticity_score: number;
  is_verified: boolean;
}

export interface ApprovalItem {
  id: string;
  dispute_id: string;
  amount: number;
  required_role: string;
  status: string;
  requester_agent: string;
  approved_by?: string;
  review_notes?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  trace_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  event_payload: string;
  prev_hash: string;
  current_hash: string;
  created_at: string;
}

export interface PolicyRule {
  id: string;
  rule_code: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  is_active: boolean;
  version: number;
  updated_at: string;
}

export interface SystemStats {
  disputes: {
    total: number;
    resolved_refunded: number;
    pending_human_review: number;
    resolved_rejected: number;
  };
  financial: {
    total_refund_volume: number;
    currency: string;
  };
  security: {
    threats_blocked: number;
    policy_fail_closed_status: string;
  };
}

export interface TimelineEntry {
  stage: string;
  timestamp: string;
  agent: string;
  message: string;
}
