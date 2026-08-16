export interface ToolPolicy {
  timeoutMs: number;
  retry: { max: number; backoffMs: number } | null;
}

// The policy belongs to the tool, not the caller — a lookup and a financial
// mutation should never share a retry policy just because they're both "a
// tool call."
export const toolPolicies: Record<string, ToolPolicy> = {
  findCustomer: { timeoutMs: 3000, retry: { max: 3, backoffMs: 200 } },
  findOrder: { timeoutMs: 3000, retry: { max: 3, backoffMs: 200 } },
  checkEligibility: { timeoutMs: 2000, retry: { max: 2, backoffMs: 200 } },
  issueRefund: { timeoutMs: 2000, retry: { max: 2, backoffMs: 300 } },
  sendEmail: { timeoutMs: 3000, retry: { max: 3, backoffMs: 200 } },
};

export const defaultPolicy: ToolPolicy = { timeoutMs: 5000, retry: null };
