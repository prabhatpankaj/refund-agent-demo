import { startRefundWorkflow, WORKFLOW_BUDGET } from "./workflow.js";
import { store } from "./store.js";
import { configurePaymentGateway } from "./services/payment.js";

configurePaymentGateway({ simulateTimeoutOnFirstCall: false });

// A real workflow needs 5-6 steps to finish. Set the budget artificially
// low to prove the ceiling is actually enforced by code, not by the model
// deciding to stop.
WORKFLOW_BUDGET.maxSteps = 2;

console.log(`Budget set to ${WORKFLOW_BUDGET.maxSteps} steps (a full refund normally takes 5-6).\n`);

const workflowId = await startRefundWorkflow("c_1002", "o_8921");
const workflow = await store.get(workflowId);

console.log(`\nfinal status: ${workflow!.status}`);
console.log(`steps used: ${workflow!.stepCount} / budget: ${WORKFLOW_BUDGET.maxSteps}`);
if (workflow!.context.reason) console.log(`reason: ${workflow!.context.reason}`);
console.log(
  workflow!.status === "failed"
    ? "\n✅ the ceiling fired and stopped the workflow before it did anything unsafe."
    : "\n(workflow finished before hitting the budget — raise WORKFLOW_BUDGET.maxSteps lower to see it trip)"
);
