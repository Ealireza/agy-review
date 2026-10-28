import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildInstruction, checkPreservation, loadGlossary, splitChunks } from "../plugins/agy-review/scripts/lib/translate.mjs";

test("instruction carries tone, audience, variant, glossary and keep-list", () => {
  const t = buildInstruction({ to: "Portuguese", variant: "pt-BR", from: "auto", tone: "friendly", audience: "new developers", glossary: [["commit", "commit"], ["branch", "ramo"], ["cache", "="]], keep: ["Git"] });
  assert.match(t, /into Portuguese \(pt-BR\)/);
  assert.match(t, /Tone and register: friendly/);
  assert.match(t, /Audience: new developers/);
  assert.match(t, /branch => ramo/);
  assert.match(t, /untranslated: cache, Git/);
  assert.ok(!/from auto/.test(t));
});

test("glossary loads from JSON and from CSV with comments", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gl-"));
  fs.writeFileSync(path.join(d, "g.json"), '{"repo":"مخزن","API":"="}');
  fs.writeFileSync(path.join(d, "g.csv"), "# terms\nrepo,مخزن\nAPI\n");
  assert.deepEqual(loadGlossary(path.join(d, "g.json")), [["repo", "مخزن"], ["API", "="]]);
  assert.deepEqual(loadGlossary(path.join(d, "g.csv")), [["repo", "مخزن"], ["API", "="]]);
});

test("chunks never cut a fenced code block and respect the size limit", () => {
  const code = "```js\nconst a = 1;\n\nconst b = 2;\n```\n";
  const text = ["para one", "", "para two", "", code, "para three", ""].join("\n");
  const chunks = splitChunks(text, 30);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.equal((c.match(/^\s*```/gm) ?? []).length % 2, 0, "balanced fences per chunk");
  assert.equal(chunks.join("\n").replace(/\n+/g, "\n"), text.replace(/\n+/g, "\n"));
});

test("preservation check catches changed code, URLs, placeholders and headings", () => {
  const src = "# Title\n\nRun `npm test` at https://example.com/a and show {{name}} and %s.\n\n```sh\nnpm test\n```\n";
  const good = "# Titre\n\nExecutez `npm test` sur https://example.com/a et affichez {{name}} et %s.\n\n```sh\nnpm test\n```\n";
  assert.equal(checkPreservation(src, good).ok, true);
  const bad = "Titre\n\nExecutez `npm tester` sur https://example.com/b et affichez {{nom}}.\n\n```sh\nnpm tester\n```\n";
  const r = checkPreservation(src, bad);
  assert.equal(r.ok, false);
  const names = r.issues.map((i) => i.check);
  for (const n of ["inline code", "URLs", "placeholders", "Markdown headings"]) assert.ok(names.includes(n), n);
});
