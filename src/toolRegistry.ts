import * as tools from "./tools.js";

export interface ToolDefinition {
  name: string;
  sideEffect: "read" | "financial" | "notification";
  requiresApproval: boolean;
  execute: (workflowId: string, args: Record<string, unknown>) => Promise<unknown>;
}

// The declarative contract behind "the model proposes, a deterministic
// layer authorizes." Nothing reads this and calls the model — it's the
// other way around: proposeAction() (authorize.ts) looks a tool up here
// BEFORE running it, and requiresApproval is what actually gates the
// side effect. Add a new financial tool here and it's gated for free;
// forget to mark it, and it isn't — which is the honest failure mode of
// any allowlist, not something special to agents.
export const toolRegistry: Record<string, ToolDefinition> = {
  findCustomer: {
    name: "findCustomer",
    sideEffect: "read",
    requiresApproval: false,
    execute: (workflowId, args) => tools.findCustomer(workflowId, args.customerId as string),
  },
  findOrder: {
    name: "findOrder",
    sideEffect: "read",
    requiresApproval: false,
    execute: (workflowId, args) => tools.findOrder(workflowId, args.orderId as string),
  },
  checkEligibility: {
    name: "checkEligibility",
    sideEffect: "read",
    requiresApproval: false,
    execute: (workflowId, args) => tools.checkEligibility(workflowId, args.orderId as string),
  },
  issueRefund: {
    name: "issueRefund",
    sideEffect: "financial",
    requiresApproval: true,
    execute: (workflowId, args) => tools.issueRefund(workflowId, args.orderId as string, args.amount as number),
  },
  sendEmail: {
    name: "sendEmail",
    sideEffect: "notification",
    requiresApproval: false,
    execute: (workflowId, args) => tools.sendEmail(workflowId, args.to as string, args.orderId as string),
  },
};
