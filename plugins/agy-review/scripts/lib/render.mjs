// Markdown rendering of a report. The JSON report is the source of truth; this is only a view of it.
const SEV_ORDER = ["critical", "high", "medium", "low", "nit"];
const loc = (f) => (f.line_end > f.line_start ? `${f.file}:${f.line_start}-${f.line_end}` : `${f.file}:${f.line_start}`);
const indent = (s, n) => String(s).split("\n").map((l) => " ".repeat(n) + l).join("\n");
const oneLine = (s) => String(s).replace(/\s*\n\s*/g, " ");

function finding(f) {
  const tags = [f.priority, f.category, `confidence ${f.confidence}`];
  if (f.exploitability) tags.push(`exploitability ${f.exploitability}`);
  if (f.cwe) tags.push(f.cwe);
  if (f.owasp) tags.push(`OWASP ${f.owasp}`);
  if (f.agreement && f.agreement.total > 1) tags.push(`${f.agreement.count}/${f.agreement.total} models agree`);
  if (f.severity_disagreement) tags.push("models disagree on severity");
  if (f.scope === "context") tags.push("outside requested scope");
  if (f.grounding === "pattern") tags.push("found by pattern scan");
  else if (f.grounding !== "exact") tags.push("line corrected");
  return [
    `- **${f.title}** - \`${loc(f)}\` [${tags.join(" | ")}] (id ${f.id})`,
    `  Evidence:`, indent(f.evidence, 6),
    `  Problem: ${oneLine(f.explanation)}`,
    f.attack_scenario ? `  Attack: ${oneLine(f.attack_scenario)}` : "",
    f.data_flow ? `  Data flow: ${oneLine(f.data_flow)}` : "",
    f.fix ? `  Fix: ${oneLine(f.fix)}` : "",
    f.cve ? `  ${f.cve} (claimed by the model, NOT verified: check NVD/OSV before relying on it)` : "",
  ].filter(Boolean).join("\n");
}

export function renderMarkdown(r) {
  const out = [];
  const c = r.counts;
  const title = r.review_type === "security" ? "Security review" : "Summary";
  out.push(`## ${title}`, `**Verdict: ${r.verdict.replace(/_/g, " ")}**. ${r.summary || ""}`.trim(), "");
  if (r.verdict === "inconclusive") out.push(`This is NOT an approval: ${r.incomplete ? `${r.failed_models.join(", ")} produced no report. ` : ""}${r.rejected.length ? `${r.rejected.length} finding(s) were rejected because their quoted code was not found. ` : ""}${r.coverage < 0.8 ? `The reviewer covered only ${Math.round(r.coverage * 100)}% of the requested lines. ` : ""}Run again, with a narrower scope or another model.`, "");
  out.push(`Target: ${r.target.description} | mode: ${r.mode} | model: ${r.models.join(", ")} | effort: ${r.effort.value} (${r.effort.reason})`);
  out.push(`Findings: ${c.total} verified (${SEV_ORDER.map((s) => `${c[s]} ${s}`).join(", ")}).` +
    (r.context_findings?.length ? ` ${r.context_findings.length} in surrounding code.` : "") +
    (r.speculative.length ? ` ${r.speculative.length} low-confidence.` : "") +
    (r.rejected.length ? ` ${r.rejected.length} rejected (quoted code not found).` : ""), "");
  for (const sev of SEV_ORDER) {
    const list = r.findings.filter((f) => f.severity === sev);
    out.push(`### ${sev[0].toUpperCase()}${sev.slice(1)}`, list.length ? list.map(finding).join("\n\n") : "(none)", "");
  }
  if (r.context_findings?.length) out.push(`### Surrounding code (not part of the requested scope, not counted)`, r.context_findings.map(finding).join("\n\n"), "");
  if (r.speculative.length) out.push(`### Low confidence (not counted)`, r.speculative.map(finding).join("\n\n"), "");
  if (r.signals?.length) out.push(`### Pattern scan signals (leads, not findings)`, r.signals.map((s) => `- \`${s.file}:${s.line}\` ${s.rule}${s.cwe ? " " + s.cwe : ""}: ${s.message} - \`${s.text}\``).join("\n"), "");
  if (r.related_code?.length) out.push(`### Related code reviewed as context`, r.related_code.map((x) => `- \`${x.file}:${x.line_start}-${x.line_end}\` (${x.note})`).join("\n"), "");
  if (r.questions.length) out.push(`### Questions for the author`, r.questions.map((q) => `- ${q.question}${q.file ? ` (\`${q.file}${q.line ? ":" + q.line : ""}\`)` : ""}`).join("\n"), "");
  if (r.limitations.length) out.push(`### Not reviewed / limitations`, r.limitations.map((l) => `- ${l}`).join("\n"), "");
  if (r.rejected.length) out.push(`### Rejected findings (could not be grounded in the code)`, r.rejected.map((x) => `- ${x.title} (${x.file}) - ${x.reason}`).join("\n"), "");
  if (r.comparison) {
    const k = r.comparison;
    out.push(`### Compared with previous report`, `${k.new.length} new, ${k.persisting.length} still present, ${k.resolved.length} resolved, ${k.not_reported?.length ?? 0} not reported again although the code is unchanged.`, "");
  }
  if (r.gate.fail_on !== "none") out.push(`Gate: ${r.gate.failed ? "FAILED" : "passed"} (fail on ${r.gate.fail_on} or worse).`);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
