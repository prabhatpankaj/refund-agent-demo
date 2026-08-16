export interface RefundRecord {
  idempotencyKey: string;
  orderId: string;
  amount: number;
  chargedAt: string;
}

let processedRefunds: RefundRecord[] = [];
let seenKeys = new Set<string>();
let callCount = 0;
let simulateTimeoutOnFirstCall = false;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Reset the gateway's state between demo runs. */
export function configurePaymentGateway(opts: { simulateTimeoutOnFirstCall: boolean }): void {
  simulateTimeoutOnFirstCall = opts.simulateTimeoutOnFirstCall;
  processedRefunds = [];
  seenKeys = new Set();
  callCount = 0;
}

export function getLedger(): RefundRecord[] {
  return processedRefunds.slice();
}

/**
 * Stands in for a real payment provider (Stripe, Razorpay, ...). Real
 * gateways reserve the idempotency key the moment a request arrives, then
 * dedupe any later request carrying the same key — the client's job is only
 * to send the SAME key on a retry. This mock enforces exactly that contract;
 * see tools.ts for the part that can get it wrong.
 */
export async function submitRefund(
  orderId: string,
  amount: number,
  idempotencyKey: string
): Promise<RefundRecord & { replay: boolean }> {
  callCount += 1;
  const isFirstCall = callCount === 1;

  if (seenKeys.has(idempotencyKey)) {
    // A request with this key is already in flight or done. Wait for it and
    // hand back its result instead of doing the side effect again.
    while (!processedRefunds.find((r) => r.idempotencyKey === idempotencyKey)) {
      await delay(50);
    }
    const existing = processedRefunds.find((r) => r.idempotencyKey === idempotencyKey)!;
    return { ...existing, replay: true };
  }

  seenKeys.add(idempotencyKey); // reserved up front, like a real gateway would

  // Simulate the first attempt being slow enough that the CLIENT gives up
  // and times out — while the charge keeps processing on the server and
  // completes anyway. This is the exact ambiguity from the article.
  const processingMs = simulateTimeoutOnFirstCall && isFirstCall ? 3000 : 200;
  await delay(processingMs);

  const record: RefundRecord = { idempotencyKey, orderId, amount, chargedAt: new Date().toISOString() };
  processedRefunds.push(record);
  return { ...record, replay: false };
}
