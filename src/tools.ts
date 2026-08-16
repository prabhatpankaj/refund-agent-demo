import { randomUUID } from "node:crypto";
import { callTool } from "./toolRuntime.js";
import * as crm from "./services/crm.js";
import * as payment from "./services/payment.js";
import * as email from "./services/email.js";

export async function findCustomer(workflowId: string, customerId: string) {
  return callTool(workflowId, "findCustomer", () => crm.lookupCustomer(customerId));
}

export async function findOrder(workflowId: string, orderId: string) {
  return callTool(workflowId, "findOrder", () => crm.lookupOrder(orderId));
}

export async function checkEligibility(workflowId: string, orderId: string) {
  return callTool(workflowId, "checkEligibility", () => crm.checkEligibility(orderId));
}

export async function issueRefund(workflowId: string, orderId: string, amount: number) {
  const idempotent = process.env.IDEMPOTENT !== "false";

  return callTool(workflowId, "issueRefund", () => {
    // Computed INSIDE the retried closure on purpose: the safe key is
    // deterministic (same workflow, same step → same key on every attempt),
    // so a retry is recognized as "the same request" by the gateway. Set
    // IDEMPOTENT=false to reproduce the naive version instead — a fresh
    // random key minted on every single attempt, indistinguishable from a
    // brand new refund as far as the gateway is concerned.
    const idempotencyKey = idempotent ? `${workflowId}:refund:${orderId}` : `unsafe:${randomUUID()}`;
    return payment.submitRefund(orderId, amount, idempotencyKey);
  });
}

export async function sendEmail(workflowId: string, to: string, orderId: string) {
  return callTool(workflowId, "sendEmail", () =>
    email.sendEmail(to, "Your refund has been processed", `Order ${orderId} has been refunded.`)
  );
}
