// --effort auto: a deterministic, explainable choice. No extra model call; the reason is always reported.
// `max` is never chosen automatically (cost): ask for it explicitly.
const LEVELS = ["low", "medium", "high", "xhigh"];
const up = (lvl, n = 1) => LEVELS[Math.min(LEVELS.length - 1, LEVELS.indexOf(lvl) + n)];

export function effortForReview({ lines, focus = "", agentic = false }) {
  let lvl = lines < 40 ? "medium" : lines < 300 ? "high" : "xhigh";
  const why = [`${lines} line(s) in scope -> ${lvl}`];
  if (/secur|auth|crypt|inject|concurren|race|deadlock|transaction|payment|money|migration/i.test(focus)) { lvl = up(lvl); why.push("risk-sensitive focus +1"); }
  if (agentic && lvl === "medium") { lvl = "high"; why.push("repo exploration needs reasoning -> high"); }
  return { effort: lvl, reason: why.join("; ") };
}

export function effortForTask({ instruction, inputChars = 0 }) {
  const t = String(instruction).toLowerCase();
  const heavy = /\b(design|architect|analy[sz]e|compare|plan|debug|prove|derive|optimi[sz]e|trade-?off|strategy|root cause|review|audit)\b/.test(t);
  const light = /\b(translate|translation|rewrite|rephrase|proofread|fix grammar|summari[sz]e|tl;?dr|format|convert|extract|list|classify|tag|title|name)\b/.test(t);
  let lvl = heavy ? "high" : light ? "low" : "medium";
  const why = [heavy ? "reasoning-heavy wording -> high" : light ? "mechanical transform -> low" : "open-ended generation -> medium"];
  if (inputChars > 40_000) { lvl = up(lvl); why.push("very long input +1"); }
  else if (inputChars > 12_000 && lvl === "low") { lvl = "medium"; why.push("long input -> medium"); }
  return { effort: lvl, reason: why.join("; ") };
}

export function resolveEffort(requested, auto) {
  if (!requested || requested === "auto") return { ...auto, source: "auto" };
  return { effort: requested, reason: "set by user", source: "user" };
}
