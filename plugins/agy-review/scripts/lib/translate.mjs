// Translation preset: the model translates; this module guarantees what a model cannot promise itself.
// It builds a precise instruction, splits long texts safely, and checks that code, URLs, placeholders and structure survived.
import fs from "node:fs";
import { UsageError } from "./util.mjs";

export const TONES = ["formal", "neutral", "friendly", "casual", "technical", "marketing", "literary", "legal"];

// "key,value" lines or a JSON object {"source":"target"}. A target of "=" or empty means "keep the term as is".
export function loadGlossary(file) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8").replace(/^﻿/, ""); } catch (e) { throw new UsageError(`Cannot read glossary ${file}: ${e.code ?? e.message}`); }
  if (raw.trim().startsWith("{")) {
    try { return Object.entries(JSON.parse(raw)).map(([s, t]) => [s, String(t)]); } catch (e) { throw new UsageError(`Glossary ${file} is not valid JSON: ${e.message}`); }
  }
  return raw.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#")).map((l) => {
    const i = l.indexOf(",");
    return i < 0 ? [l.trim(), "="] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  });
}

export function buildInstruction({ to, from, tone, audience, variant, glossary = [], keep = [], notes }) {
  const target = variant ? `${to} (${variant})` : to;
  const lines = [
    `Translate the text in <input> ${from && from !== "auto" ? `from ${from} ` : ""}into ${target}.`,
    tone ? `Tone and register: ${tone}.` : "Tone and register: match the source.",
    audience ? `Audience: ${audience}.` : "",
    "Rules:",
    "- Translate meaning, not words; the result must read as if written natively in the target language.",
    "- Preserve all structure exactly: Markdown headings, lists, tables, emphasis, line breaks and paragraph order.",
    "- Do not translate or alter: fenced code blocks, inline `code`, URLs, file paths, command lines, placeholders such as {{name}}, {name}, ${name}, %s, %d, %1$s, and HTML/XML tags and attributes.",
    "- Keep numbers, units and dates correct; adapt their format to the target locale only if the source clearly uses a locale format.",
    "- Do not add, remove, summarise or explain anything. Do not add notes.",
  ];
  const fixed = glossary.filter(([, t]) => t !== "=" && t !== "");
  const same = [...glossary.filter(([, t]) => t === "=" || t === "").map(([s]) => s), ...keep];
  if (fixed.length) lines.push("Glossary (use these translations every time, in every inflected form that the target language allows):", ...fixed.map(([s, t]) => `  ${s} => ${t}`));
  if (same.length) lines.push(`Keep these terms exactly as written, untranslated: ${same.join(", ")}.`);
  if (notes) lines.push(`Additional instructions from the user: ${notes}`);
  return lines.filter(Boolean).join("\n");
}

// Splits on blank lines, never inside a fenced code block, into chunks of at most `max` characters.
export function splitChunks(text, max = 8000) {
  const blocks = [];
  let cur = [], fence = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) fence = !fence;
    cur.push(line);
    if (!fence && line.trim() === "") { blocks.push(cur.join("\n")); cur = []; }
  }
  if (cur.length) blocks.push(cur.join("\n"));
  // A paragraph larger than the limit is cut at line ends, then sentence ends, then hard. A code block is never cut: it is sent whole.
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].length <= max || /^\s*```/.test(blocks[i])) continue;
    const pieces = [];
    let acc = "";
    const units = blocks[i].split("\n").flatMap((l) => (l.length <= max ? [l] : l.split(/(?<=[.!?。！？])\s+/).flatMap((s) => s.match(new RegExp(`[\\s\\S]{1,${max}}`, "g")) ?? [])));
    for (const u of units) {
      if (acc && acc.length + u.length + 1 > max) { pieces.push(acc + "\n"); acc = ""; }
      acc += (acc ? "\n" : "") + u;
    }
    if (acc) pieces.push(acc);
    blocks.splice(i, 1, ...pieces);
    i += pieces.length - 1;
  }
  const chunks = [];
  let acc = "";
  for (const b of blocks) {
    if (acc && acc.length + b.length + 1 > max) { chunks.push(acc); acc = ""; }
    acc += (acc ? "\n" : "") + b;
  }
  if (acc) chunks.push(acc);
  return chunks;
}

const multiset = (s, re) => { const m = new Map(); for (const x of s.match(re) ?? []) m.set(x, (m.get(x) ?? 0) + 1); return m; };
const diff = (a, b) => {
  const miss = [], extra = [];
  for (const [k, n] of a) if ((b.get(k) ?? 0) < n) miss.push(k);
  for (const [k, n] of b) if ((a.get(k) ?? 0) < n) extra.push(k);
  return { miss, extra };
};

const CHECKS = [
  ["fenced code blocks", /^\s*```[^\n]*$/gm],
  ["inline code", /`[^`\n]+`/g],
  ["URLs", /https?:\/\/[^\s)>\]"'`]+/g],
  ["placeholders", /\{\{[^}\n]+\}\}|\$\{[^}\n]+\}|%\d*\$?[sdifu@]|\{[0-9A-Za-z_.]+\}/g],
  ["HTML/XML tags", /<\/?[A-Za-z][^<>\n]*>/g],
  ["Markdown headings", /^#{1,6}\s/gm],
];

// Complete fenced blocks, fences included. Code must come back byte for byte.
const fences = (s) => [...s.matchAll(/^[ \t]*```[^\n]*\n[\s\S]*?\n[ \t]*```[ \t]*$/gm)].map((m) => m[0]);
const countMap = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1); return m; };

export function checkPreservation(source, translated) {
  const issues = [];
  const code = diff(countMap(fences(source)), countMap(fences(translated)));
  if (code.miss.length || code.extra.length) issues.push({ check: "fenced code content", missing: code.miss.slice(0, 3).map((b) => b.slice(0, 80)), unexpected: code.extra.slice(0, 3).map((b) => b.slice(0, 80)) });
  for (const [name, re] of CHECKS) {
    const { miss, extra } = diff(multiset(source, re), multiset(translated, re));
    if (miss.length || extra.length) issues.push({ check: name, missing: miss.slice(0, 5), unexpected: extra.slice(0, 5) });
  }
  const ratio = translated.length / Math.max(1, source.length);
  if (source.length > 200 && (ratio < 0.25 || ratio > 4)) issues.push({ check: "length", note: `output is ${ratio.toFixed(2)}x the input length` });
  return { ok: issues.length === 0, issues };
}
