import { buildPublicProfileDraft, toPublicProfile } from "./public-profile";
import { derivePositioningAdvice } from "./positioning";
import { siteUrl } from "./site";
import type { CrawledPage, PublicProfile, PublicProfileDraft, PublicProfileFact, ScanResult } from "./types";

const normalize = (value: string) => value.replace(/\s+/gu, " ").trim();
const labels = "所在地|住所|営業時間|受付時間|定休日|電話番号|対応エリア|対応地域|専門分野|事業内容|会社名|法人名|設立|料金|費用";
const field = new RegExp(`^(${labels})[：:\\s]+(.+)$`, "u");
const fieldBoundary = new RegExp(`([\\s|｜])(?=(?:${labels})[：:\\s])`, "gu");
const assertedMarker = /入力情報|入力内容|参照元未確認/u;

function isRovanSource(value: string) {
  try {
    const url = new URL(value);
    return url.origin === new URL(siteUrl).origin || /^\/ai\/company(?:\/|$)/u.test(decodeURIComponent(url.pathname));
  } catch { return false; }
}

/** Flat labels and bullets survive HTML stripping; substring matches are not proof. */
function sourceFacts(page: CrawledPage, baselineValues: string[]): PublicProfileFact[] {
  const text = page.text.replace(fieldBoundary, "$1\n");
  const asserted = assertedMarker.test(page.text);
  return text.split(/[\r\n]+|[•●■▪]|(?<=[。！？!?])/u).flatMap((part) => {
    const value = normalize(part.replace(/^\s*[-*・]\s*/u, ""));
    if (!value || value.length > 200 || /^[(（]/u.test(value)) return [];
    const match = value.match(field);
    if (!match && value.length < 8 && !/専門|対応|相談/u.test(value) && !baselineValues.includes(value)) return [];
    if (match && match[2].length < 2) return [];
    return [{ label: match?.[1] || "参照元の記載", value: match?.[2] || value, sourceUrl: page.url,
      provenance: asserted ? "company_asserted" as const : "source_excerpt" as const }];
  });
}

export type ProfileSelectionReason = "no_eligible_sources" | "no_source_facts" | "strategy_no_match" | "source_provenance_required" | null;

/** Reject selection.status === "empty" before persistence.
 * sourceProfile must come from a server-side lookup, never request JSON.
 * Strategy ranks actual source additions; it never supplies public facts. */
export function buildSelectedPublicProfileDraft(
  result: ScanResult, pages: CrawledPage[], strategyId: string,
  options: { sourceProfile?: PublicProfile } = {},
) {
  const strategy = (result.positioning?.strategies || derivePositioningAdvice(result).strategies || []).find((item) => item.id === strategyId);
  if (strategyId && !strategy) throw new Error("選択した候補が見つかりません。再読み込みしてください。");
  const draft = buildPublicProfileDraft(result);
  const target = new URL(result.targetUrl);
  const eligible = pages.filter((page) => {
    try {
      const url = new URL(page.url);
      return url.origin === target.origin && !isRovanSource(page.url) && !url.username && !url.password && !url.search && !url.hash
        && !page.noindex && page.text.trim().length > 0 && page.text.length < 30_000;
    } catch { return false; }
  });
  let facts: PublicProfileFact[] = [];
  let sourcePages: PublicProfileDraft["sourcePages"] = [];
  let reason: ProfileSelectionReason = null;
  let selectedFactCount = 0;
  let subject = { title: draft.title, brandName: draft.brandName };
  let metadata = { summary: "", market: "", targetCustomers: [] as string[], useCases: [] as string[] };

  if (isRovanSource(result.targetUrl)) {
    const source = options.sourceProfile;
    const path = `/ai/company/${encodeURIComponent(source?.slug || "")}`;
    if (!source || target.pathname.replace(/\/$/u, "") !== path || source.status !== "published" || !(Date.parse(source.expiresAt) > Date.now())) {
      reason = "source_provenance_required";
    } else {
      // Never read another company's crawled page or promote legacy/self assertions.
      subject = { title: source.title, brandName: source.brandName };
      facts = source.facts.map((fact) => ({ ...fact, provenance: fact.provenance === "source_excerpt" && !isRovanSource(fact.sourceUrl) ? "source_excerpt" : "company_asserted" }));
      sourcePages = source.sourcePages.filter((page) => !isRovanSource(page.url));
      const confirmed = (value: string) => Boolean(value) && facts.some((fact) => fact.provenance === "source_excerpt" && normalize(fact.value) === normalize(value));
      metadata = {
        // 入力から作ったページ（Rovan上のURLが元）の紹介文は、本人の入力としてそのまま引き継ぐ
        summary: confirmed(source.summary) || assertedMarker.test(source.summary) || isRovanSource(source.targetUrl) ? source.summary : "",
        market: confirmed(source.market) ? source.market : "",
        targetCustomers: source.targetCustomers.filter(confirmed), useCases: source.useCases.filter(confirmed),
      };
    }
  } else {
    const candidates = eligible.flatMap((page) => sourceFacts(page, draft.facts.map((fact) => normalize(fact.value))));
    const confirmedSource = (value: string) => {
      if (!normalize(value)) return undefined;
      const fact = candidates.find((item) => item.provenance === "source_excerpt" && normalize(item.value) === normalize(value));
      if (fact) return fact;
      // A multi-sentence baseline paragraph can be a complete source unit too.
      const page = eligible.find((item) => !assertedMarker.test(item.text) && item.text.split(/[\r\n]+/u).some((line) => normalize(line) === normalize(value)));
      return page ? { sourceUrl: page.url } : undefined;
    };
    // Retain baseline facts only when their complete value occurs in a source unit.
    const baseline = draft.facts.flatMap((fact) => {
      const evidence = confirmedSource(fact.value);
      return evidence ? [{ ...fact, sourceUrl: evidence.sourceUrl, provenance: "source_excerpt" as const }] : [];
    });
    const basic = candidates.filter((fact) => field.test(`${fact.label}: ${fact.value}`));
    const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
    const words = [...segmenter.segment(strategy ? strategy.focusKeyword || `${strategy.name} ${strategy.targetMarket}` : "")]
      .filter((word) => word.isWordLike && word.segment.length >= 2).map((word) => word.segment.toLowerCase());
    const selected = candidates.map((fact) => ({ fact, score: words.filter((word) => `${fact.label} ${fact.value}`.toLowerCase().includes(word)).length }))
      .filter((item) => !strategy || item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map((item) => item.fact);
    selectedFactCount = selected.length;
    facts = [...baseline, ...basic, ...selected];
    metadata = {
      summary: confirmedSource(draft.summary) ? draft.summary : "", market: confirmedSource(draft.market) ? draft.market : "",
      targetCustomers: draft.targetCustomers.filter((value) => confirmedSource(value)), useCases: draft.useCases.filter((value) => confirmedSource(value)),
    };
    sourcePages = eligible.map((page) => ({ url: page.url, title: page.title, description: "" }));
    reason = !eligible.length ? "no_eligible_sources" : !candidates.length ? "no_source_facts" : strategy && !selected.length ? "strategy_no_match" : null;
  }
  facts = [...new Map(facts.map((fact) => [JSON.stringify([fact.value, fact.sourceUrl, fact.provenance]), fact])).values()];
  const safe = toPublicProfile({ ...draft, ...subject, ...metadata, facts, sourcePages, id: "", slug: "", token: "", sourceScanId: result.scanId,
    status: "draft", createdAt: result.measuredAt, updatedAt: result.measuredAt, expiresAt: result.measuredAt });
  const assertedFactCount = safe.facts.filter((fact) => fact.provenance === "company_asserted").length;
  const status = safe.facts.length ? "ready" as const : "empty" as const;
  return { draft: safe as PublicProfileDraft, selection: {
    status, reason: reason || (status === "empty" ? "no_source_facts" : null), strategyId: strategy?.id || null,
    supportedFactCount: safe.facts.length - assertedFactCount, assertedFactCount, selectedFactCount,
  } };
}
