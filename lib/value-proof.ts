import { matchingConsultations } from "./prompt-evidence";
import type { Citation, Observation, ProviderName, PublicProfileRecord, ScanResult, WatchRecord } from './types';

export const proofProviders: ProviderName[] = ['openai', 'gemini', 'perplexity'];
export const providerLabel = { openai: 'ChatGPT', gemini: 'Gemini', perplexity: 'Perplexity' };
export function evidenceUrl(value: string): string | null {
  try { const u = new URL(value); if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) return null; u.search = ''; u.hash = ''; return u.href.replace(/\/$/u, ''); } catch { return null; }
}
const safeText = (value: string) => value.replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+\S+)/gu, '[非表示]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu, '[メール非表示]');
export function sameProofPanel(a: ScanResult, b: ScanResult) {
  return a.targetUrl === b.targetUrl && a.panel.kind === b.panel.kind && a.panel.version === b.panel.version && a.panel.locale === b.panel.locale && a.panel.country === b.panel.country && a.panel.repetitions === b.panel.repetitions && a.panel.promptCount === b.panel.promptCount;
}
export function proofVote(scan: ScanResult, promptId: string, provider: ProviderName) {
  const prompt = scan.prompts?.find(p => p.id === promptId);
  const rows = scan.observations.filter(o => o.promptId === promptId && o.provider === provider);
  const complete = Boolean(prompt) && rows.length === scan.panel.repetitions && new Set(rows.map(o => o.repetition)).size === scan.panel.repetitions && rows.every(o => Number.isInteger(o.repetition) && o.repetition >= 1 && o.repetition <= scan.panel.repetitions && o.status === 'success' && o.prompt === prompt!.text && Boolean(o.model));
  return { complete, included: complete ? rows.filter(o => o.ownRecommended).length > rows.length / 2 : null, signature: JSON.stringify([prompt?.text, rows.map(o => [o.repetition, o.model]).sort()]), rows };
}
function answer(o: Observation) {
  return { id: o.id, status: o.status, model: o.model, repetition: o.repetition, completedAt: o.completedAt, included: o.ownRecommended,
    candidates: o.recommendedEntities, text: safeText(o.rawText || '').slice(0, 12000), truncated: (o.rawText || '').length > 12000,
    sources: o.citations.flatMap(c => { const url = evidenceUrl(c.url); return url ? [{ url, title: safeText(c.title), kind: c.kind || 'unclassified' }] : []; }) };
}
export function buildValueProof(watch: WatchRecord, profile: PublicProfileRecord | null = null) {
  const { baseline, latest } = watch;
  const separate = baseline.scanId !== latest.scanId && Date.parse(latest.measuredAt) > Date.parse(baseline.measuredAt);
  const published = profile?.status === 'published' && Date.parse(profile.expiresAt) > Date.now() ? profile : null;
  const profilePath = published ? `/ai/company/${encodeURIComponent(published.slug)}` : null;
  const rows = (latest.prompts || []).flatMap(p => proofProviders.map(provider => {
    const before = proofVote(baseline, p.id, provider), after = proofVote(latest, p.id, provider);
    const comparable = separate && sameProofPanel(baseline, latest) && before.complete && after.complete && before.signature === after.signature;
    const state = !separate ? 'baseline' : !comparable ? 'unavailable' : before.included === after.included ? 'unchanged' : after.included ? 'won' : 'lost';
    return { id: `${provider}:${p.id}`, promptId: p.id, prompt: p.text, provider, state, comparable, before: before.included, after: after.included,
      beforeAnswers: before.rows.map(answer), afterAnswers: after.rows.map(answer) };
  }));
  const sourceMap = new Map<string, { url: string; domain: string; kind: Citation['kind'] | 'unclassified'; count: number; answerCount: number; unknownCount: number; promptIds: string[]; providers: ProviderName[]; owned: boolean }>();
  let ownHost = ''; try { ownHost = new URL(latest.targetUrl).hostname.replace(/^www\./u, ''); } catch { /* invalid legacy target */ }
  for (const o of latest.observations.filter(o => o.status === 'success')) {
    const seen = new Set<string>();
    for (const c of o.citations) {
      const url = evidenceUrl(c.url); if (!url || seen.has(url)) continue; seen.add(url);
      const host = new URL(url).hostname.replace(/^www\./u, '');
      const item = sourceMap.get(url) || { url, domain: host, kind: c.kind || 'unclassified', count: 0, answerCount: 0, unknownCount: 0, promptIds: [], providers: [], owned: host === ownHost || host.endsWith(`.${ownHost}`) };
      item.count++; if (!c.kind) item.unknownCount++; if (c.kind === 'answer') { item.kind = 'answer'; item.answerCount++; }
      item.promptIds = [...new Set([...item.promptIds, o.promptId])]; item.providers = [...new Set([...item.providers, o.provider])]; sourceMap.set(url, item);
    }
  }
  const sources = [...sourceMap.values()].sort((a,b) => b.count-a.count || a.url.localeCompare(b.url));
  const changes = (watch.autoActions || []).filter(a => a.status === 'applied' && a.executedAt).map(a => {
    const start = [baseline, ...watch.history].find(s => s.scanId === a.beforeScanId);
    const afterPublication = Date.parse(latest.measuredAt) > Date.parse(a.executedAt!);
    const comparisons = start && afterPublication && sameProofPanel(start, latest) ? a.affectedPromptIds.flatMap(id => proofProviders.flatMap(provider => {
      const b = proofVote(start, id, provider), n = proofVote(latest, id, provider);
      return b.complete && n.complete && b.signature === n.signature ? [{ promptId: id, provider, before: b.included!, after: n.included! }] : [];
    })) : [];
    return { id: a.id, summary: a.summary, executedAt: a.executedAt!, promptIds: a.affectedPromptIds, publishedUrl: a.publishedUrl ? evidenceUrl(a.publishedUrl) : null,
      addedFacts: (a.addedFacts || []).map(f => ({ label: f.label, value: safeText(f.value), sourceUrl: evidenceUrl(f.sourceUrl) })),
      removedFacts: (a.removedFacts || []).map(f => ({ label: f.label, value: safeText(f.value), sourceUrl: evidenceUrl(f.sourceUrl) })),
      comparisons, stage: !a.affectedPromptIds.length ? 'unlinked' : !afterPublication ? 'waiting' : !comparisons.length ? 'unavailable' : 'measured' };
  }).sort((a,b) => b.executedAt.localeCompare(a.executedAt));
  return { company: latest.discovery.brandName, baselineAt: baseline.measuredAt, measuredAt: latest.measuredAt, panel: latest.panel,
    rows, sources, changes, profilePath,
    opportunities: (latest.prompts || []).filter(p => rows.some(r => r.promptId === p.id && r.after === false)).map(p => ({
      promptId: p.id, prompt: p.text,
      excludedProviders: rows.filter(r => r.promptId === p.id && r.after === false).map(r => r.provider),
      facts: (published?.facts || []).filter(f => f.provenance === 'source_excerpt' && matchingConsultations(f, [p]).length > 0)
        .slice(0,3).map(f => ({ label: f.label, value: safeText(f.value), sourceUrl: evidenceUrl(f.sourceUrl) })),
    })), profileUpdatedAt: published?.updatedAt || null,
    automationEnabled: Boolean(published?.automation?.enabled), nextRunAt: ['active','trial'].includes(watch.status) ? watch.nextRunAt : null,
    // An exact configured origin match is checked by the API; pathname alone is never proof of citation.
    publishedCitations: [] as string[],
    trend: [...new Map([baseline, ...watch.history, latest].map(s => [s.scanId, s])).values()].sort((a,b) => a.measuredAt.localeCompare(b.measuredAt)).map(s => ({ measuredAt: s.measuredAt, panel: s.panel.kind, providers: proofProviders.map(provider => {
      const votes = (s.prompts || []).map(p => proofVote(s,p.id,provider)); const success = votes.filter(v => v.complete);
      return { provider, included: success.filter(v => v.included).length, successful: success.length, scheduled: s.panel.promptCount };
    }) })) };
}
export type ValueProof = ReturnType<typeof buildValueProof>;
export function proofCsv(proof: ValueProof) {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/^[=+@\-\t\r]/u, "'$&").replaceAll('"','""')}"`;
  const states: Record<string,string> = { won:'名前が出るように', lost:'名前が出なくなった', unchanged:'変化なし', unavailable:'比べられない', baseline:'初回' };
  const lines: unknown[][] = [['会社','初回の日時','今回の日時','AI','質問','初回 名前','今回 名前','変化','初回にすすめられた会社','今回すすめられた会社','今回AIが参考にしたページ']];
  for (const r of proof.rows) lines.push([proof.company,proof.baselineAt,proof.measuredAt,providerLabel[r.provider],r.prompt,r.before === null ? '取得できず' : r.before ? 'あり':'なし',r.after === null ? '取得できず':r.after?'あり':'なし',states[r.state] || r.state,r.beforeAnswers.map(a=>a.candidates.join(' / ')).join(' | '),r.afterAnswers.map(a=>a.candidates.join(' / ')).join(' | '),r.afterAnswers.flatMap(a=>a.sources.map(s=>s.url)).join(' | ')]);
  return '\uFEFF' + lines.map(row=>row.map(cell).join(',')).join('\r\n');
}

export function isPublishedCitation(citation:Citation, profileUrl:string) {
  if(citation.kind!=='answer')return false;
  try {
    const a=new URL(citation.url),b=new URL(profileUrl);
    if(a.username||a.password||a.origin!==b.origin||[...a.searchParams.keys()].some(k=>!k.startsWith('utm_')))return false;
    const base=b.pathname.replace(/\/$/u,'');
    return [base,`${base}/`,`${base}/json`,`${base}/md`,`${base}.json`,`${base}.md`].includes(a.pathname);
  }catch{return false;}
}
