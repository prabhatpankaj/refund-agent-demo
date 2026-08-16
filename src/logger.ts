export function log(event: string, fields: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  console.log(`${ts}  ${event.padEnd(20)} ${JSON.stringify(fields)}`);
}
