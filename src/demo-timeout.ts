import { startRefundWorkflow, resumeRefundWorkflow } from "./workflow.js";
import { store } from "./store.js";
import { configurePaymentGateway, getLedger } from "./services/payment.js";

// This is the incident from the article, reproduced end to end: the
// payment gateway processes the refund but the response arrives after the
// tool's timeout, so callTool retries. Run with IDEMPOTENT=false to see the
// bug; the default (IDEMPOTENT unset/true) shows the fix.
const unsafe = process.env.IDEMPOTENT === "false";
configurePaymentGateway({ simulateTimeoutOnFirstCall: true });

console.log(`\nRunning the refund workflow with idempotency ${unsafe ? "DISABLED — reproducing the incident" : "ENABLED — the fix"}.`);
console.log("The payment gateway will take 3s on the first attempt; the tool's timeout is 2s.\n");

const workflowId = await startRefundWorkflow("c_1002", "o_8921");

// Skip the interactive approval step for this demo — jump straight from
// eligibility_checked to refund_submitted, as if a human had just clicked
// Approve.
await store.update(workflowId, { status: "refund_submitted" });
await resumeRefundWorkflow(workflowId);

// Give the first (abandoned-by-the-client, but still-running) attempt time
// to finish and write its record, so the ledger below is complete.
await new Promise((r) => setTimeout(r, 2000));

const ledger = getLedger();
const total = ledger.reduce((sum, r) => sum + r.amount, 0);

console.log(`\n--- payment gateway ledger ---`);
for (const r of ledger) {
  console.log(`  ${r.idempotencyKey.padEnd(40)} ₹${r.amount}  ${r.chargedAt}`);
}
console.log(`\ncharges recorded: ${ledger.length}`);
console.log(`total charged: ₹${total}`);
console.log(ledger.length > 1 ? "\n❌ customer was charged twice." : "\n✅ exactly one charge, despite the retry.");
