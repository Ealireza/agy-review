// agy-review site: language switch (12 languages, RTL for fa/ar), theme, install tabs, copy buttons, reveal.
// The page is complete English HTML without JavaScript; this file only enhances it. No external requests.
(() => {
  "use strict";
  const LANGS = ["en", "fa", "zh-CN", "ru", "es", "ar", "tr", "ja", "ko", "pt-BR", "de", "fr"];
  const RTL = new Set(["fa", "ar"]);
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const live = $("#live");
  const say = (m) => { if (live) { live.textContent = ""; setTimeout(() => (live.textContent = m), 30); } };
  root.classList.add("js");

  // ---------- i18n ----------
  const cache = {};
  const base = new URL("assets/i18n/", document.baseURI);
  const load = async (code) => {
    if (cache[code]) return cache[code];
    try { const r = await fetch(new URL(`${code}.json`, base)); if (r.ok) return (cache[code] = await r.json()); } catch { /* offline or file:// */ }
    return null;
  };
  const pick = () => {
    const q = new URLSearchParams(location.search).get("lang");
    let saved = null; try { saved = localStorage.getItem("agyr-lang"); } catch { /* storage blocked */ }
    const want = q || saved || navigator.language || "en";
    const exact = LANGS.find((l) => l.toLowerCase() === want.toLowerCase());
    if (exact) return exact;
    const prefix = want.toLowerCase().split("-")[0];
    return LANGS.find((l) => l.toLowerCase().split("-")[0] === prefix) || "en";
  };
  const apply = async (code) => {
    const en = await load("en");
    const dict = code === "en" ? en : await load(code);
    if (!en) return;
    const t = (k) => (dict && dict[k]) || en[k];
    $$("[data-i18n]").forEach((el) => { const v = t(el.dataset.i18n); if (v) el.textContent = v; });
    $$("[data-i18n-attr]").forEach((el) => { const [a, k] = el.dataset.i18nAttr.split(":"); const v = t(k); if (v) el.setAttribute(a, v); });
    $$("[data-copy]").forEach((b) => b.setAttribute("aria-label", t("ui.copy")));
    document.title = t("meta.title");
    const d = $('meta[name="description"]'); if (d) d.content = t("meta.desc");
    root.lang = code; root.dir = RTL.has(code) ? "rtl" : "ltr";
    const sel = $("#lang"); if (sel) sel.value = code;
    try { localStorage.setItem("agyr-lang", code); } catch { /* storage blocked */ }
  };
  const sel = $("#lang");
  if (sel) sel.addEventListener("change", () => apply(sel.value));
  apply(pick());

  // ---------- theme ----------
  const themeBtn = $("#theme");
  const current = () => root.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const next = current() === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("agyr-theme", next); } catch { /* storage blocked */ }
  });

  // ---------- mobile menu ----------
  const menu = $("#menu"), nav = $("#nav");
  if (menu && nav) {
    menu.addEventListener("click", () => { const o = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(o)); });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); } });
  }

  // ---------- tabs (WAI-ARIA tabs pattern: arrows, Home, End) ----------
  $$("[data-tabs]").forEach((group) => {
    const tabs = $$('[role="tab"]', group);
    const show = (tab, focus) => {
      tabs.forEach((x) => {
        const on = x === tab;
        x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1;
        $("#" + x.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => show(tab));
      tab.addEventListener("keydown", (e) => {
        const rtl = root.dir === "rtl";
        const next = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
        if (next) { e.preventDefault(); show(tabs[(i + next + tabs.length) % tabs.length], true); }
        else if (e.key === "Home") { e.preventDefault(); show(tabs[0], true); }
        else if (e.key === "End") { e.preventDefault(); show(tabs[tabs.length - 1], true); }
      });
    });
  });

  // ---------- copy ----------
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch { /* ignore */ }
    ta.remove(); return ok;
  };
  $$("[data-copy]").forEach((btn) => btn.addEventListener("click", async () => {
    const code = $("code", btn.parentElement);
    if (!code || !(await copyText(code.textContent))) return;
    const label = $("span", btn), old = label.textContent, icon = $("use", btn);
    label.textContent = (cache[root.lang] && cache[root.lang]["ui.copied"]) || "Copied";
    icon.setAttribute("href", "#i-check"); btn.classList.add("done"); say(label.textContent);
    setTimeout(() => { label.textContent = old; icon.setAttribute("href", "#i-copy"); btn.classList.remove("done"); }, 1800);
  }));

  // ---------- reveal ----------
  // Position-based, not IntersectionObserver: an observer can miss an element during a fast scroll or a jump to an anchor,
  // which would leave it invisible forever. Anything at or above the bottom edge of the viewport is shown.
  const items = $$(".reveal");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) items.forEach((el) => el.classList.add("in"));
  else {
    // A loop over a couple of dozen elements is cheaper than scheduling it, and it does not depend on animation frames.
    const reveal = () => {
      const limit = innerHeight * 0.92;
      for (const el of items) if (!el.classList.contains("in") && el.getBoundingClientRect().top < limit) el.classList.add("in");
    };
    addEventListener("scroll", reveal, { passive: true });
    addEventListener("resize", reveal);
    addEventListener("hashchange", reveal);
    reveal();
  }
})();
