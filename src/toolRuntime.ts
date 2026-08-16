import { toolPolicies, defaultPolicy } from "./policies.js";
import { log } from "./logger.js";

export class ToolTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ToolTimeoutError(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Every tool call in the workflow routes through here. It's the one place
// that knows about workflowId, timeouts, and retries — individual tools
// (tools.ts) stay dumb wrappers around the mock services.
export async function callTool<T>(workflowId: string, toolName: string, fn: () => Promise<T>): Promise<T> {
  const policy = toolPolicies[toolName] ?? defaultPolicy;
  const maxAttempts = (policy.retry?.max ?? 0) + 1;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      // NOTE: withTimeout races the caller's patience against fn(); it does
      // NOT cancel fn() itself. That's deliberate — a real HTTP client can't
      // un-send a request either, which is exactly the ambiguity this whole
      // demo is about.
      const result = await withTimeout(fn(), policy.timeoutMs);
      log("tool_call", { workflowId, toolName, attempt, status: "ok", durationMs: Date.now() - start });
      return result;
    } catch (err) {
      lastErr = err;
      log("tool_call", { workflowId, toolName, attempt, status: "error", durationMs: Date.now() - start, error: String(err) });
      if (attempt < maxAttempts && policy.retry) {
        await sleep(policy.retry.backoffMs * attempt);
        continue;
      }
      break;
    }
  }
  throw lastErr;
}
