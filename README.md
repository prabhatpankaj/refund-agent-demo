# Refund Agent Demo

Runnable companion code for [Your AI Agent Is a Distributed System](../ai-agent-distributed-systems.md). Every external service (CRM, payment gateway, email, inventory, delivery) is mocked in-memory, so nothing here needs an API key or a real database — it's meant to be read alongside the source, not just run.

## Setup

```bash
npm install
```

## Demos

### 1. The happy path — durable state across processes

```bash
npm run demo:happy
```

This starts a workflow, runs it up to the point where it needs approval, persists that to `data/workflows.json`, and exits — nothing is left running. Copy the workflow ID it prints, then resume it from a **separate process**, simulating a Slack approval arriving hours later:

```bash
npm run approve -- wf_xxxxxxxx approved
```

Check state at any time, from any process:

```bash
npm run status                 # list all workflows
npm run status -- wf_xxxxxxxx  # inspect one
```

### 2. The actual bug — and the fix

```bash
npm run demo:timeout          # idempotency ON — the fix
npm run demo:timeout:unsafe   # idempotency OFF — reproduces the incident
```

The mock payment gateway takes 3 seconds to process a refund on the first attempt; the tool's timeout is 2 seconds. So the client gives up and retries — while the original request keeps processing on the "server" and completes anyway. That's the exact ambiguity from the article.

- With idempotency on, the retry reuses the same key, the gateway recognizes it, and the ledger shows **one charge**.
- With `IDEMPOTENT=false`, the retry mints a fresh random key (the naive version's behavior), the gateway can't tell it's a duplicate, and the ledger shows **two charges** — ₹9,000 charged on a ₹4,500 refund.

### 3. Execution budget as a safety net

```bash
npm run demo:budget
```

Artificially caps the workflow at 2 steps (a real refund takes 5–6) to prove the ceiling is enforced by code — the workflow stops itself and marks the run `failed` with a reason, rather than continuing indefinitely.

### 4. Saga compensation

```bash
npm run demo:saga
```

A separate order-fulfillment workflow (reserve inventory → charge card → schedule delivery) where the last step is forced to fail. Watch it unwind the two steps that already succeeded, in reverse order.

## Layout

```
src/
  types.ts          workflow status + record shape (incl. ProposedAction)
  store.ts           JSON-file-backed durable state (stands in for Postgres)
  policies.ts         per-tool timeout/retry config
  toolRuntime.ts       callTool() — timeout + retry + logging, shared by every tool
  tools.ts            findCustomer / findOrder / checkEligibility / issueRefund / sendEmail
  toolRegistry.ts       declarative metadata per tool: requiresApproval, execute()
  authorize.ts         proposeAction() / executeApprovedAction() — the ONLY way any
                       tool call reaches a mock service; gates on the registry
  workflow.ts          the state machine / orchestrator, resumable from any status —
                       every step routes through proposeAction(), never calls a tool directly
  services/            mock CRM, payment gateway, email, inventory, delivery
  demo-*.ts            entry points for each scenario above
  approve-cli.ts        simulates the "human approves" webhook
  status-cli.ts         inspect workflow state
```

`workflow.ts` never calls `tools.issueRefund()` (or any other tool) directly — every step proposes `{ tool, args }` to `proposeAction()`, which looks the tool up in `toolRegistry.ts` and only runs it if `requiresApproval` is `false`. For `issueRefund`, that's always `true`, so the proposed action (including its exact args) is persisted to `context.pendingAction` and the workflow pauses; `npm run approve` later calls `executeApprovedAction()` with that same recorded action, never with whatever happens to be in context at resume time. Add a new financial tool to the registry and it's gated automatically — no switch-case to remember to update.

Reset all workflow data between runs with `npm run clean`.
