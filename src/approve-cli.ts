import { store } from "./store.js";
import { resumeRefundWorkflow } from "./workflow.js";

// Simulates the Slack "Approve" button webhook from the article: a totally
// separate process, run whenever a human gets around to it, that resumes a
// workflow purely from what's on disk.
const [workflowId, decision] = process.argv.slice(2);

if (!workflowId || (decision !== "approved" && decision !== "denied")) {
  console.error("usage: npm run approve -- <workflowId> approved|denied");
  process.exit(1);
}

const workflow = await store.get(workflowId);
if (!workflow) {
  console.error(`no such workflow: ${workflowId}`);
  process.exit(1);
}
if (workflow.status !== "awaiting_approval") {
  console.error(`workflow ${workflowId} is not awaiting approval (status: ${workflow.status})`);
  process.exit(1);
}

if (decision === "approved") {
  await store.update(workflowId, { status: "refund_submitted" });
  await resumeRefundWorkflow(workflowId);
} else {
  await store.update(workflowId, { status: "denied", context: { reason: "human_denied" } });
  console.log(`\nWorkflow ${workflowId} denied.`);
}

const final = await store.get(workflowId);
console.log(`\nfinal status: ${final!.status}`);
