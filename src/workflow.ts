import { randomUUID } from "node:crypto";
import { store } from "./store.js";
import { log } from "./logger.js";
import { proposeAction, executeApprovedAction } from "./authorize.js";
import type { RefundRecord } from "./services/payment.js";
import type { Customer, Order } from "./services/crm.js";

// A hard ceiling on the workflow as a whole, independent of any single
// tool's retry policy — mutable so demo-budget.ts can shrink it and show
// the ceiling actually firing.
export const WORKFLOW_BUDGET = { maxSteps: 15 };

export async function startRefundWorkflow(customerId: string, orderId: string): Promise<string> {
  const workflowId = `wf_${randomUUID().slice(0, 8)}`;
  await store.create(workflowId, { customerId, orderId });
  log("workflow_started", { workflowId, customerId, orderId });
  await advance(workflowId);
  return workflowId;
}

export async function resumeRefundWorkflow(workflowId: string): Promise<void> {
  log("workflow_resumed", { workflowId });
  await advance(workflowId);
}

// Reads status off the store, does the next thing, persists, repeats.
// A process crash or restart just means the next call to advance() picks up
// exactly where the last one left off — nothing lives only in memory.
async function advance(workflowId: string): Promise<void> {
  let workflow = await store.get(workflowId);
  if (!workflow) throw new Error(`unknown workflow ${workflowId}`);

  while (true) {
    if (workflow.stepCount >= WORKFLOW_BUDGET.maxSteps) {
      await store.update(workflowId, {
        status: "failed",
        context: { ...workflow.context, reason: "step budget exceeded" },
      });
      log("workflow_escalated", { workflowId, reason: "step budget exceeded", stepCount: workflow.stepCount });
      return;
    }

    switch (workflow.status) {
      // Every case below calls proposeAction() instead of a tool function
      // directly — even for reads, which the registry marks
      // requiresApproval: false and so execute immediately. The point isn't
      // that lookups need gating; it's that there is exactly ONE path by
      // which any tool in this system gets invoked, and that path is the
      // one that checks the registry first.
      case "started": {
        const outcome = await proposeAction(workflowId, {
          tool: "findCustomer",
          args: { customerId: workflow.context.customerId },
        });
        const customer = (outcome as { status: "executed"; result: unknown }).result as Customer;
        await store.update(workflowId, {
          status: "customer_identified",
          context: { customerName: customer.name, customerEmail: customer.email },
        });
        break;
      }

      case "customer_identified": {
        const outcome = await proposeAction(workflowId, { tool: "findOrder", args: { orderId: workflow.context.orderId } });
        const order = (outcome as { status: "executed"; result: unknown }).result as Order;
        await store.update(workflowId, { status: "order_found", context: { refundAmount: order.amount } });
        break;
      }

      case "order_found": {
        const outcome = await proposeAction(workflowId, {
          tool: "checkEligibility",
          args: { orderId: workflow.context.orderId },
        });
        const eligible = (outcome as { status: "executed"; result: unknown }).result as boolean;
        if (!eligible) {
          await store.update(workflowId, { status: "failed", context: { reason: "not eligible" } });
          log("workflow_terminal", { workflowId, status: "failed", reason: "not eligible" });
          return;
        }
        await store.update(workflowId, { status: "eligibility_checked" });
        break;
      }

      case "eligibility_checked": {
        const outcome = await proposeAction(workflowId, {
          tool: "issueRefund",
          args: { orderId: workflow.context.orderId, amount: workflow.context.refundAmount },
        });
        if (outcome.status === "paused_for_approval") return; // nothing left running until a human resumes it
        break; // issueRefund is always requiresApproval: true in this registry, so this branch is unreachable — kept honest rather than assumed
      }

      case "refund_submitted": {
        // A human approved workflow.context.pendingAction earlier; run
        // exactly that, through the same registry, rather than trusting
        // whatever's currently in context.orderId/refundAmount.
        const pending = workflow.context.pendingAction;
        if (!pending) throw new Error(`workflow ${workflowId} reached refund_submitted with no pendingAction on record`);
        const result = (await executeApprovedAction(workflowId, pending)) as RefundRecord & { replay: boolean };
        await store.update(workflowId, {
          status: "refund_confirmed",
          context: { chargedAt: result.chargedAt, replay: result.replay, pendingAction: undefined },
        });
        break;
      }

      case "refund_confirmed": {
        await proposeAction(workflowId, {
          tool: "sendEmail",
          args: { to: workflow.context.customerEmail, orderId: workflow.context.orderId },
        });
        await store.update(workflowId, { status: "notified" });
        break;
      }

      case "notified":
        log("workflow_completed", { workflowId });
        return;

      case "awaiting_approval":
        log("workflow_waiting", { workflowId });
        return;

      case "failed":
      case "denied":
        log("workflow_terminal", { workflowId, status: workflow.status });
        return;
    }

    await store.incrementStep(workflowId);
    workflow = (await store.get(workflowId))!;
  }
}
