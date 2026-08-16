import { store } from "./store.js";
import { log } from "./logger.js";
import { toolRegistry } from "./toolRegistry.js";
import type { ProposedAction } from "./types.js";

export type ProposalOutcome = { status: "executed"; result: unknown } | { status: "paused_for_approval" };

// This is the one function allowed to run a tool. The model — or, here, the
// workflow's own state machine, standing in for it — never calls
// tools.issueRefund() directly; it can only propose { tool, args }, and
// whether that actually runs depends on registry metadata this function
// owns, not on anything the caller decided.
export async function proposeAction(workflowId: string, action: ProposedAction): Promise<ProposalOutcome> {
  const tool = toolRegistry[action.tool];
  if (!tool) throw new Error(`propose: unknown tool "${action.tool}"`);

  if (tool.requiresApproval) {
    await store.update(workflowId, { status: "awaiting_approval", context: { pendingAction: action } });
    log("approval_requested", { workflowId, action });
    console.log(`\n⏸  Workflow ${workflowId} is paused for approval: ${action.tool}(${JSON.stringify(action.args)})`);
    console.log(`   Approve it from another process:`);
    console.log(`     npm run approve -- ${workflowId} approved\n`);
    return { status: "paused_for_approval" };
  }

  const result = await tool.execute(workflowId, action.args);
  return { status: "executed", result };
}

// Called once a human has approved a previously-paused action — runs the
// exact { tool, args } that was proposed, still through the registry, so
// there's no second code path that could execute something different from
// what was actually shown to the approver.
export async function executeApprovedAction(workflowId: string, action: ProposedAction): Promise<unknown> {
  const tool = toolRegistry[action.tool];
  if (!tool) throw new Error(`execute: unknown tool "${action.tool}"`);
  return tool.execute(workflowId, action.args);
}
