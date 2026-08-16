export interface Customer {
  id: string;
  name: string;
  email: string;
}

export interface Order {
  id: string;
  customerId: string;
  amount: number;
  eligibleForRefund: boolean;
}

const customers: Record<string, Customer> = {
  c_1002: { id: "c_1002", name: "Meera Iyer", email: "meera@example.com" },
};

const orders: Record<string, Order> = {
  o_8921: { id: "o_8921", customerId: "c_1002", amount: 4500, eligibleForRefund: true },
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function lookupCustomer(customerId: string): Promise<Customer> {
  await delay(120 + Math.random() * 120);
  const customer = customers[customerId];
  if (!customer) throw new Error(`customer ${customerId} not found`);
  return customer;
}

export async function lookupOrder(orderId: string): Promise<Order> {
  await delay(120 + Math.random() * 120);
  const order = orders[orderId];
  if (!order) throw new Error(`order ${orderId} not found`);
  return order;
}

export async function checkEligibility(orderId: string): Promise<boolean> {
  await delay(80);
  const order = orders[orderId];
  if (!order) throw new Error(`order ${orderId} not found`);
  return order.eligibleForRefund;
}
