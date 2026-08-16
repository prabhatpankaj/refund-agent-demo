import { randomUUID } from "node:crypto";
import { callTool } from "./toolRuntime.js";
import { reserveInventory, releaseInventory, getReserved } from "./services/inventory.js";
import { chargeCard, refundCharge } from "./services/sagaPayment.js";
import { scheduleDelivery, cancelDelivery } from "./services/delivery.js";

// A different workflow than the refund agent — order fulfillment, which
// touches three independent systems. schedule_delivery is forced to fail so
// the saga has to unwind what already succeeded.
const workflowId = `wf_${randomUUID().slice(0, 8)}`;
const ctx = { orderId: "o_9110", sku: "SKU-COFFEE-01", qty: 2, amount: 1200 };

interface SagaStep {
  name: string;
  run: () => Promise<unknown>;
  compensate: () => Promise<unknown>;
}

const steps: SagaStep[] = [
  {
    name: "reserve_inventory",
    run: () => reserveInventory(ctx.sku, ctx.qty),
    compensate: () => releaseInventory(ctx.sku, ctx.qty),
  },
  {
    name: "charge_payment",
    run: () => chargeCard(ctx.orderId, ctx.amount),
    compensate: () => refundCharge(ctx.orderId, ctx.amount),
  },
  {
    name: "schedule_delivery",
    run: () => scheduleDelivery(ctx.orderId, { fail: true }), // forced failure
    compensate: () => cancelDelivery(ctx.orderId),
  },
];

console.log(`Running order fulfillment saga for ${ctx.orderId}...\n`);
console.log(`inventory reserved before start: ${getReserved(ctx.sku)}\n`);

const completed: typeof steps = [];
try {
  for (const step of steps) {
    await callTool(workflowId, step.name, step.run);
    completed.push(step);
  }
  console.log("\n✅ saga completed — all three steps succeeded.");
} catch (err) {
  console.log(`\n❌ step failed: ${String(err)}`);
  console.log("running compensations in reverse order...\n");
  for (const step of completed.reverse()) {
    await callTool(workflowId, `compensate_${step.name}`, step.compensate);
  }
  console.log(`\ninventory reserved after compensation: ${getReserved(ctx.sku)}`);
  console.log("✅ compensations complete — no orphaned inventory hold or charge left behind.");
}
