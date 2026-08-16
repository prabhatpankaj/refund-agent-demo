const reserved = new Map<string, number>();

export async function reserveInventory(sku: string, qty: number) {
  await new Promise((r) => setTimeout(r, 100));
  reserved.set(sku, (reserved.get(sku) ?? 0) + qty);
  return { sku, qty, reserved: true };
}

export async function releaseInventory(sku: string, qty: number) {
  await new Promise((r) => setTimeout(r, 100));
  reserved.set(sku, Math.max(0, (reserved.get(sku) ?? 0) - qty));
  return { sku, qty, released: true };
}

export function getReserved(sku: string): number {
  return reserved.get(sku) ?? 0;
}
