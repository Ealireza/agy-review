// Cross-model agreement and comparison with an earlier report. Both are deterministic: no model is asked to judge.
import { order } from "./ground.mjs";
import { CONFIDENCES, norm, sevRank } from "./util.mjs";

const overlap = (a, b) => a.file === b.file && a.line_start <= b.line_end && b.line_start <= a.line_end;
const same = (a, b) => a.id === b.id || (overlap(a, b) && a.category === b.category);

// runs: [{ model, verified, speculative }]. Findings of different models cluster only when they point at the same code and category.
export function mergeRuns(runs) {
  const total = runs.length;
  const clusters = [];
  for (const run of runs) {
    for (const f of [...run.verified, ...run.speculative]) {
      const c = clusters.find((cl) => !cl.models.has(run.model) && cl.items.some((x) => same(x, f)));
      if (c) { c.items.push(f); c.models.add(run.model); c.by[run.model] = f.severity; }
      else clusters.push({ items: [f], models: new Set([run.model]), by: { [run.model]: f.severity } });
    }
  }
  return clusters.map((c) => {
    const best = [...c.items].sort((a, b) => sevRank(a.severity) - sevRank(b.severity))[0];
    const count = c.models.size;
    const exact = count >= 2 && c.items.every((x) => x.id === best.id);
    const confidence = exact && best.confidence === "low" ? "medium" : best.confidence;
    const ranks = c.items.map((x) => sevRank(x.severity));
    return {
      ...best, confidence,
      agreement: { count, total, models: [...c.models] },
      severity_by_model: c.by,
      ...(Math.max(...ranks) - Math.min(...ranks) >= 2 ? { severity_disagreement: true } : {}),
    };
  }).sort(order);
}

export function splitByConfidence(findings, minConfidence) {
  const min = CONFIDENCES.indexOf(minConfidence);
  return {
    verified: findings.filter((f) => CONFIDENCES.indexOf(f.confidence) >= min),
    speculative: findings.filter((f) => CONFIDENCES.indexOf(f.confidence) < min),
  };
}

// Compares current findings with a previous report. A finding that is no longer reported is only "resolved" if its evidence
// is also gone from the code; if the code is unchanged the reviewer simply did not report it again ("not_reported").
// `stillPresent(prevFinding)` answers that question from the real sources.
export function compareWithPrevious(previous, current, stillPresent = () => false) {
  const prevAll = [...(previous?.findings ?? [])];
  const key = (f) => `${f.file}|${norm(f.evidence)}`;
  const curById = new Map(current.map((f) => [f.id, f]));
  const curByKey = new Map(current.map((f) => [key(f), f]));
  const persisting = [], resolved = [], notReported = [];
  for (const p of prevAll) {
    const hit = curById.get(p.id) ?? curByKey.get(key(p));
    if (hit) persisting.push(hit.id);
    else if (stillPresent(p)) notReported.push(p.id);
    else resolved.push(p.id);
  }
  const known = new Set([...prevAll.map((p) => p.id), ...prevAll.map(key)]);
  const added = current.filter((f) => !known.has(f.id) && !known.has(key(f))).map((f) => f.id);
  return { previous_generated_at: previous?.generated_at ?? null, new: added, persisting, resolved, not_reported: notReported };
}
