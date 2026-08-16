import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkflowRecord, WorkflowContext } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DATA_FILE = join(DATA_DIR, "workflows.json");

type Table = Record<string, WorkflowRecord>;

function readAll(): Table {
  if (!existsSync(DATA_FILE)) return {};
  return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Table;
}

function writeAll(data: Table): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// A JSON file standing in for `workflows` — same job Postgres does in the
// article: state a fresh process (or a fresh `npm run approve` invocation)
// can read back without needing anything from the process that wrote it.
export const store = {
  async create(id: string, context: WorkflowContext): Promise<WorkflowRecord> {
    const all = readAll();
    const now = new Date().toISOString();
    const record: WorkflowRecord = { id, status: "started", context, stepCount: 0, createdAt: now, updatedAt: now };
    all[id] = record;
    writeAll(all);
    return record;
  },

  async get(id: string): Promise<WorkflowRecord | undefined> {
    return readAll()[id];
  },

  async update(id: string, patch: Partial<Pick<WorkflowRecord, "status" | "context">>): Promise<WorkflowRecord> {
    const all = readAll();
    const existing = all[id];
    if (!existing) throw new Error(`unknown workflow ${id}`);
    const updated: WorkflowRecord = {
      ...existing,
      ...patch,
      context: { ...existing.context, ...(patch.context ?? {}) },
      updatedAt: new Date().toISOString(),
    };
    all[id] = updated;
    writeAll(all);
    return updated;
  },

  async incrementStep(id: string): Promise<WorkflowRecord> {
    const all = readAll();
    const existing = all[id];
    if (!existing) throw new Error(`unknown workflow ${id}`);
    existing.stepCount += 1;
    existing.updatedAt = new Date().toISOString();
    writeAll(all);
    return existing;
  },

  async list(): Promise<WorkflowRecord[]> {
    return Object.values(readAll());
  },
};
