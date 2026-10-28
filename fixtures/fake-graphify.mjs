// A stand-in for the `graphify` CLI (run as: node fake-graphify.mjs ...). Records how it was called and, for `extract`, behaves like
// graphify does with an OpenAI-compatible backend: it POSTs a chat completion to OLLAMA_BASE_URL with the bearer key it was given.
//   FAKE_GFY_LOG      file that receives one JSON line per call: { args, backend, base, hasKey }
//   FAKE_GFY_REPLY    file that receives the model's reply text for `extract`
//   FAKE_GFY_SUMMARY  summary line `extract` prints (default: one file re-extracted)
//   FAKE_GFY_FAIL     if set, `extract` exits 1
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const log = (o) => process.env.FAKE_GFY_LOG && fs.appendFileSync(process.env.FAKE_GFY_LOG, JSON.stringify({ args, backend: process.env.GRAPHIFY_BACKEND ?? null, base: process.env.OLLAMA_BASE_URL ?? null, hasKey: !!process.env.OLLAMA_API_KEY, skipHook: process.env.GRAPHIFY_SKIP_HOOK ?? null, ...o }) + "\n");

if (args[0] === "--version") { console.log("graphify 0.0.0-fake"); process.exit(0); }
if (args[0] === "hook") { log({}); console.log(`hook ${args[1]} ok`); process.exit(0); }

if (args[0] === "extract") {
  log({});
  if (process.env.FAKE_GFY_FAIL) { console.error("[graphify extract] error: all semantic chunks failed"); process.exit(1); }
  const res = await fetch(`${process.env.OLLAMA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OLLAMA_API_KEY}` },
    body: JSON.stringify({ model: args[args.indexOf("--model") + 1], messages: [{ role: "system", content: "Extract a graph. Output JSON only." }, { role: "user", content: [{ type: "text", text: "docs/a.md: Discounts never go below zero." }, { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } }] }] }),
  });
  const body = await res.json();
  if (process.env.FAKE_GFY_REPLY) fs.writeFileSync(process.env.FAKE_GFY_REPLY, body.choices?.[0]?.message?.content ?? JSON.stringify(body));
  fs.mkdirSync("graphify-out", { recursive: true });
  fs.writeFileSync(path.join("graphify-out", "graph.json"), JSON.stringify({ nodes: [{ id: "a" }], links: [] }));
  console.log(process.env.FAKE_GFY_SUMMARY ?? "[graphify extract] incremental summary: 3 files cached/unchanged, 1 re-extracted, 0 deleted");
  process.exit(res.ok ? 0 : 1);
}
if (args[0] === "cluster-only") { log({}); console.log("clustered"); process.exit(0); }
console.log("fake graphify: unhandled", args.join(" "));
process.exit(0);
