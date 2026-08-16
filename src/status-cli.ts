import { store } from "./store.js";

const [workflowId] = process.argv.slice(2);

if (workflowId) {
  const workflow = await store.get(workflowId);
  if (!workflow) {
    console.error(`no such workflow: ${workflowId}`);
    process.exit(1);
  }
  console.log(JSON.stringify(workflow, null, 2));
} else {
  const all = await store.list();
  for (const w of all) {
    console.log(`${w.id}  ${w.status.padEnd(20)} steps=${w.stepCount}  updated=${w.updatedAt}`);
  }
  if (all.length === 0) console.log("(no workflows yet — run npm run demo:happy)");
}
