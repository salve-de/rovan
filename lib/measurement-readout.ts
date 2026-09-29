import type { Observation, ScanResult } from "./types";

type ReadoutObservation = Pick<Observation, "promptId" | "prompt" | "provider" | "repetition" | "status" | "ownRecommended" | "recommendedEntities" | "firstCandidate" | "citations"> & { model?: string };
type Input = Pick<ScanResult, "panel" | "prompts" | "targetUrl" | "scheduledObservations" | "measurementCompleteness" | "measuredAt"> & { observations: ReadoutObservation[] };

/** Display companion to measurement.lostPrompts: same successful-row majority,
 * including its tie rule. This is NOT the provider-specific fixed50 North Star. */
export function measurementReadout(result: Input) {
  const rows = result.observations.filter((row) => row.status === "success" && result.prompts?.some((prompt) => prompt.id === row.promptId && prompt.text === row.prompt));
  const votes = new Map<string, boolean>();
  for (const prompt of result.prompts || []) {
    const answers = rows.filter((row) => row.promptId === prompt.id);
    if (answers.length) votes.set(prompt.id, answers.filter((row) => row.ownRecommended).length >= Math.ceil(answers.length / 2));
  }
  const included = [...votes.values()].filter(Boolean).length;
  const successful = votes.size;
  const missing = Math.max(0, result.panel.promptCount - successful);
  const complete = result.measurementCompleteness === 100 && result.scheduledObservations > 0 && rows.length === result.scheduledObservations && successful === result.panel.promptCount;
  return { rows, votes, included, excluded: successful - included, successful, missing, complete,
    // 取得できなかった質問があるときだけ、その数と「一部だけの結果」であることを添える
    label: successful ? `${included} / ${successful}問${missing || !complete ? `（${missing}問は答えを取得できず・一部だけの結果）` : ""}` : `まだ測れていません（${result.panel.promptCount}問）` };
}

function condition(row: ReadoutObservation) {
  return JSON.stringify([row.promptId, row.prompt, row.provider, row.model, row.repetition]);
}

export function compareMeasurementReadouts(baseline: Input, latest: Input, authoritativeComparable = true) {
  const before = measurementReadout(baseline);
  const after = measurementReadout(latest);
  const panelKey = (value: Input) => JSON.stringify([value.targetUrl, value.panel.kind, value.panel.version, value.panel.promptCount, value.panel.repetitions, value.panel.country, value.panel.locale]);
  const oldConditions = before.rows.map(condition).sort();
  const newConditions = after.rows.map(condition).sort();
  const comparable = authoritativeComparable && before.complete && after.complete && panelKey(baseline) === panelKey(latest)
    && new Set(oldConditions).size === oldConditions.length && new Set(newConditions).size === newConditions.length
    && JSON.stringify(oldConditions) === JSON.stringify(newConditions);
  const wins = comparable ? [...after.votes.keys()].filter((id) => !before.votes.get(id) && after.votes.get(id)) : [];
  const losses = comparable ? [...after.votes.keys()].filter((id) => before.votes.get(id) && !after.votes.get(id)) : [];
  const names = new Set([...before.rows, ...after.rows].flatMap((row) => row.recommendedEntities));
  const competitorMovements = [...names].map((name) => {
    const oldCount = before.rows.filter((row) => row.recommendedEntities.includes(name)).length;
    const newCount = after.rows.filter((row) => row.recommendedEntities.includes(name)).length;
    const baselineCoverage = before.rows.length ? Math.round(oldCount / before.rows.length * 100) : null;
    const latestCoverage = after.rows.length ? Math.round(newCount / after.rows.length * 100) : null;
    return { name, baselineCoverage, latestCoverage, diff: comparable ? latestCoverage! - baselineCoverage! : null,
      newcomer: comparable && oldCount === 0 && newCount > 0, departed: comparable && oldCount > 0 && newCount === 0 };
  });
  const signature = (rows: ReadoutObservation[]) => JSON.stringify(rows.map((row) => [condition(row), row.ownRecommended, [...row.recommendedEntities].sort(), row.firstCandidate]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  const answerChanged = comparable && signature(before.rows) !== signature(after.rows);
  const urls = (rows: ReadoutObservation[]) => new Set(rows.flatMap((row) => row.citations.map((citation) => citation.url)));
  const oldUrls = urls(before.rows), newUrls = urls(after.rows);
  const addedCitations = [...newUrls].filter((url) => !oldUrls.has(url)).length;
  const removedCitations = [...oldUrls].filter((url) => !newUrls.has(url)).length;
  const observationChanged = before.rows.length !== after.rows.length || baseline.scheduledObservations !== latest.scheduledObservations || JSON.stringify(oldConditions) !== JSON.stringify(newConditions) || panelKey(baseline) !== panelKey(latest);
  return { before, after, comparable, wins, losses, competitorMovements, answerChanged, addedCitations, removedCitations,
    baselineCitationCount: oldUrls.size, latestCitationCount: newUrls.size,
    meaningful: answerChanged || addedCitations > 0 || removedCitations > 0 || observationChanged,
    note: comparable ? `初回と今回の同じ${after.successful}問をくらべています。`
      : baseline.panel.country !== latest.panel.country || baseline.panel.locale !== latest.panel.locale ? "地域・言語がちがうため、くらべられません。"
        : !before.complete || !after.complete ? "AIの答えを取得できなかった質問があるため、くらべられません。"
          : "質問やAIの条件がちがうため、くらべられません。" };
}

export function readoutIdentity(sample: boolean, id: string | null) {
  return sample ? "sample" : `real:${id || ""}`;
}

export function safeReadoutResultHref(value?: string, fallbackId?: string) {
  try {
    if (value?.startsWith("/result?") && !value.includes("\\")) {
      const url = new URL(value, "https://rovan.invalid");
      const id = url.searchParams.get("id");
      if (url.origin === "https://rovan.invalid" && url.pathname === "/result" && id) return `/result?id=${encodeURIComponent(id)}`;
    }
  } catch { /* Fall back to the known scan ID. */ }
  return fallbackId ? `/result?id=${encodeURIComponent(fallbackId)}` : "/manage";
}

export async function updateReadoutEmail(token: string, email: string, signal: AbortSignal) {
  const response = await fetch("/api/watch", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, email: email.trim() }), signal });
  const data = await response.json() as { email?: string | null; error?: string };
  if (!response.ok) throw new Error(data.error || "設定に失敗しました。");
  return { emailConfigured: Boolean(data.email), maskedEmail: data.email || null };
}
