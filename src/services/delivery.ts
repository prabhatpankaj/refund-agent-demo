export async function scheduleDelivery(orderId: string, opts: { fail?: boolean } = {}) {
  await new Promise((r) => setTimeout(r, 100));
  if (opts.fail) throw new Error("delivery partner unavailable");
  return { orderId, scheduled: true };
}

export async function cancelDelivery(orderId: string) {
  await new Promise((r) => setTimeout(r, 80));
  return { orderId, cancelled: true };
}
