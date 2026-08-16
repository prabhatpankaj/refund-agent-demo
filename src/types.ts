export type WorkflowStatus =
  | "started"
  | "customer_identified"
  | "order_found"
  | "eligibility_checked"
  | "awaiting_approval"
  | "refund_submitted"
  | "refund_confirmed"
  | "notified"
  | "failed"
  | "denied";

export interface ProposedAction {
  tool: string;
  args: Record<string, unknown>;
}

export interface WorkflowContext {
  customerId?: string;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  refundAmount?: number;
  chargedAt?: string;
  replay?: boolean;
  reason?: string;
  pendingAction?: ProposedAction;
}

export interface WorkflowRecord {
  id: string;
  status: WorkflowStatus;
  context: WorkflowContext;
  stepCount: number;
  createdAt: string;
  updatedAt: string;
}
