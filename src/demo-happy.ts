import { startRefundWorkflow } from "./workflow.js";
import { configurePaymentGateway } from "./services/payment.js";

configurePaymentGateway({ simulateTimeoutOnFirstCall: false });

console.log("Starting refund workflow for customer c_1002, order o_8921 (₹4,500)...\n");
const workflowId = await startRefundWorkflow("c_1002", "o_8921");

console.log(`workflow id: ${workflowId}`);
console.log(`\nCheck it any time with:  npm run status -- ${workflowId}`);
