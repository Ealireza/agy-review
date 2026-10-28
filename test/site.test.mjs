import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const docs = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");
const html = fs.readFileSync(path.join(docs, "index.html"), "utf8");
const en = JSON.parse(fs.readFileSync(path.join(docs, "assets", "i18n", "en.json"), "utf8"));
const LANGS = ["en", "fa", "zh-CN", "ru", "es", "ar", "tr", "ja", "ko", "pt-BR", "de", "fr"];
const decode = (s) => s.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

test("every data-i18n key exists, and the inline English text equals en.json (no drift)", () => {
  const seen = new Set();
  for (const m of html.matchAll(/<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) {
    const [, , key, inner] = m;
    seen.add(key);
    assert.ok(key in en, `missing key ${key}`);
    if (!inner.includes("<")) assert.equal(decode(inner), en[key], `inline text of ${key} differs from en.json`);
  }
  for (const m of html.matchAll(/data-i18n-attr="[^:"]+:([^"]+)"/g)) { seen.add(m[1]); assert.ok(m[1] in en, `missing attr key ${m[1]}`); }
  const js = fs.readFileSync(path.join(docs, "assets", "app.js"), "utf8");
  const unused = Object.keys(en).filter((k) => !seen.has(k) && !k.startsWith("meta.") && !js.includes(`"${k}"`));
  assert.deepEqual(unused, [], "en.json has keys that the page never uses");
  assert.equal(decode(html.match(/<title>([^<]*)<\/title>/)[1]), en["meta.title"]);
});

test("the page loads nothing from other origins", () => {
  for (const m of html.matchAll(/<(?:link|script|img)\b[^>]*\b(?:src|href)="([^"]+)"/g)) assert.ok(!/^(https?:)?\/\//.test(m[1]), `external resource ${m[1]}`);
  const css = fs.readFileSync(path.join(docs, "assets", "style.css"), "utf8");
  assert.ok(!/@import|url\(\s*["']?https?:/.test(css), "css must not import remote assets");
});

test("all 12 language files exist with exactly the same keys as English", () => {
  for (const l of LANGS) {
    const file = path.join(docs, "assets", "i18n", `${l}.json`);
    assert.ok(fs.existsSync(file), `missing ${l}.json`);
    const raw = fs.readFileSync(file, "utf8");
    assert.ok(!raw.startsWith("﻿"), `${l}.json must not start with a BOM`);
    const d = JSON.parse(raw);
    assert.deepEqual(Object.keys(d).sort(), Object.keys(en).sort(), `${l}.json keys differ from en.json`);
    for (const [k, v] of Object.entries(d)) assert.ok(typeof v === "string" && v.trim(), `${l}.json ${k} is empty`);
  }
});

test("the language select offers the same 12 languages", () => {
  const opts = [...html.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(opts, LANGS);
});
