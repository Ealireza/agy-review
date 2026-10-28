// A stand-in for the agy binary. Behaviour is driven by env vars so tests need no model and no network.
//   FAKE_AGY_RESPONSE    path to a file whose content becomes result.response
//   FAKE_AGY_LOG         path where the received argv + prompt are written as JSON
//   FAKE_AGY_STEPS       path to a JSON array of events emitted before the result (tool steps, as real agy prints them)
//   FAKE_AGY_WRITE       path of a file this "agent" overwrites during the run (simulates a tree modification)
//   FAKE_AGY_FAIL_MODEL  --model value for which the run fails with no report
import fs from "node:fs";

const args = process.argv.slice(2);
if (args[0] === "--version") { console.log("9.9.9-fake"); process.exit(0); }
if (args[0] === "models") {
  console.error("Fetching available models...");
  console.log("fake-fast\tFake Fast (Low)\nfake-deep\tFake Deep (High)");
  process.exit(0);
}
// --effort rules, in the exact wording agy uses. FAKE_AGY_EFFORTS maps a model id (or "default") to
// an array of allowed efforts, "in-id" (effort is part of the name) or "none" (not supported).
if (process.env.FAKE_AGY_CALLS) fs.appendFileSync(process.env.FAKE_AGY_CALLS, JSON.stringify(args) + "\n");
const ei = args.indexOf("--effort");
if (ei >= 0 && process.env.FAKE_AGY_EFFORTS) {
  const effort = args[ei + 1];
  const mi = args.indexOf("--model");
  const model = mi >= 0 ? args[mi + 1] : "";
  const spec = JSON.parse(process.env.FAKE_AGY_EFFORTS)[model || "default"];
  let why = null;
  if (spec === "in-id") why = `--model ${model} conflicts with --effort=${effort}`;
  else if (spec === "none") why = `--effort is not supported for model "${model}"`;
  else if (Array.isArray(spec) && !spec.includes(effort)) why = `fake-base has no "${effort}" effort (available: ${spec.join(", ")})`;
  if (why) {
    const msg = `invalid model selection (--model "${model}" --effort "${effort}"): ${why}`;
    console.error(`error: ${msg}`);
    console.log(JSON.stringify({ event: "result", result: { conversation_id: "", status: "ERROR", response: "", error: msg, duration_seconds: 0, num_turns: 0, usage: {} } }));
    process.exit(1);
  }
  if (args.includes("-p") && args[args.indexOf("-p") + 1] === "x" && effort === "max") process.exit(0); // a probe that was accepted
}
let input = "";
for await (const chunk of process.stdin) input += chunk;
const prompt = input.trim() ? JSON.parse(input.trim().split("\n")[0]).message.content : "";
if (process.env.FAKE_AGY_LOG) fs.writeFileSync(process.env.FAKE_AGY_LOG, JSON.stringify({ args, prompt }));
if (process.env.FAKE_AGY_WRITE) fs.writeFileSync(process.env.FAKE_AGY_WRITE, `changed by the agent ${Date.now()}\n`);
const ev = (o) => console.log(JSON.stringify(o));
ev({ event: "init", init: { cwd: process.cwd(), permission_mode: "request-review" } });
if (process.env.FAKE_AGY_STEPS) for (const e of JSON.parse(fs.readFileSync(process.env.FAKE_AGY_STEPS, "utf8"))) ev(e);
const model = args[args.indexOf("--model") + 1];
if (process.env.FAKE_AGY_FAIL_MODEL && model === process.env.FAKE_AGY_FAIL_MODEL) {
  ev({ event: "result", result: { status: "ERROR", response: "", error: "fake failure", denied_actions: [] } });
  process.exit(1);
}
const response = process.env.FAKE_AGY_RESPONSE ? fs.readFileSync(process.env.FAKE_AGY_RESPONSE, "utf8") : "";
ev({ event: "result", result: { status: "SUCCESS", response, usage: { input_tokens: 10, output_tokens: 5 }, denied_actions: [] } });
