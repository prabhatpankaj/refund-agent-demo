export async function chargeCard(orderId: string, amount: number) {
  await new Promise((r) => setTimeout(r, 120));
  return { orderId, amount, charged: true };
}

export async function refundCharge(orderId: string, amount: number) {
  await new Promise((r) => setTimeout(r, 120));
  return { orderId, amount, refunded: true };
}
