/**
 * デモ（AIキー未設定の開発環境）で、AIの代わりに会社情報・質問・答えをつくる。
 * 入力（名前・地域・URLのページ）に合わせるので、監査する人は自分の入力で全画面を確かめられる。
 * 作る候補名はすべて架空で、結果には ScanResult.demo が付き画面に「デモ」と出る。
 */
import { isNoSiteTarget, noSiteInput } from "@/lib/no-site";
import type { ActionCard, BuyerPrompt, Citation, CompanyDiscovery, CrawledPage, EvidenceGap, LostPrompt, ProviderName } from "@/lib/types";
import { demoQuestionSeeds, detectIndustry, fictionalCompetitors, GENERIC_INDUSTRY, hash01, regionFromText, splitNameAndRegion, type DemoIndustry } from "./catalog";

const DEMO_COMPETITOR_NOTE = "デモ用の架空の比較候補（実在しない名前）";
const GENERIC_TITLE = /^(?:トップ(?:ページ)?|ホーム|home|top|公式サイト|オフィシャルサイト|official site|ようこそ.*)$/iu;

function brandFromTitle(title: string) {
  const parts = title.split(/\s*[|｜–—:：]\s*|\s+-\s+/u).map((part) => part.trim()).filter(Boolean);
  return (parts.find((part) => !GENERIC_TITLE.test(part)) || "").slice(0, 60);
}

/** 業種と地域を、組み立てた market（「高崎のパン屋」）から取り戻す */
export function demoContext(discovery: Pick<CompanyDiscovery, "brandName" | "market" | "summary">): { industry: DemoIndustry; region: string } {
  const industry = detectIndustry(`${discovery.market} ${discovery.brandName}`);
  const suffix = `の${industry.noun}`;
  const region = discovery.market.endsWith(suffix) ? discovery.market.slice(0, -suffix.length) : "";
  return { industry, region };
}

export function demoDiscovery(url: string, pages: CrawledPage[]): CompanyDiscovery {
  const noSite = isNoSiteTarget(url);
  const host = noSite ? "" : new URL(url).hostname.replace(/^www\./iu, "");
  const input = noSite ? splitNameAndRegion(noSiteInput(url)) : { name: "", region: "" };
  const home = pages.find((page) => { try { return new URL(page.url).pathname.replace(/\/$/u, "") === ""; } catch { return false; } }) || pages[0];
  const brandName = (noSite ? input.name : brandFromTitle(home?.title || "") || host.split(".")[0]) || "入力されたお店";

  const heading = pages.slice(0, 6).map((page) => `${page.title} ${page.description} ${page.headings.slice(0, 8).join(" ")}`).join(" ");
  let industry = detectIndustry(`${brandName} ${noSite ? "" : `${host} ${heading}`}`);
  if (industry === GENERIC_INDUSTRY && pages.length) industry = detectIndustry(pages.slice(0, 4).map((page) => page.text.slice(0, 3000)).join(" "));
  const region = noSite ? input.region : regionFromText(pages.slice(0, 6).map((page) => `${page.description} ${page.text.slice(0, 5000)}`).join(" "));
  const market = region ? `${region}の${industry.noun}` : industry.noun;
  const summary = noSite
    ? `${brandName}（${market}）。入力された名前から推定した内容です（デモ）。`
    : (home?.description?.trim().slice(0, 300) || `${brandName}の公開ページから読み取った内容です（デモ）。`);

  return {
    legalName: "",
    brandName,
    domain: host,
    summary,
    market,
    targetCustomers: [...industry.targets],
    useCases: [...industry.uses],
    aliases: [...new Set([brandName, host].filter(Boolean))],
    competitors: fictionalCompetitors(industry, `${brandName}:${region}`).map((name, index) => ({
      name,
      domain: `candidate-${String(index + 1).padStart(2, "0")}.example`,
      reason: DEMO_COMPETITOR_NOTE,
      confidence: 0.5,
    })),
    confidence: 0.7,
  };
}

export function demoPromptSeeds(discovery: CompanyDiscovery, count: number) {
  const { industry, region } = demoContext(discovery);
  return demoQuestionSeeds(industry, region).slice(0, count);
}

export function demoEvidence(discovery: CompanyDiscovery, lostPrompts: LostPrompt[]): { gaps: EvidenceGap[]; actions: ActionCard[] } {
  const { industry } = demoContext(discovery);
  const related = lostPrompts.map((item) => item.promptId);
  const gaps: EvidenceGap[] = industry.gaps.map(([label, whyItMatters], index) => ({
    id: `demo-gap-${index + 1}`,
    label,
    whyItMatters,
    relatedPromptIds: related.slice(0, Math.max(1, related.length - index * 2)),
    relatedPromptCount: Math.max(1, related.length - index * 2),
    confidence: 0.6,
    status: "missing",
  }));
  const actions: ActionCard[] = gaps.map((gap, index) => ({
    id: `demo-action-${index + 1}`,
    title: `「${gap.label}」を、AIが読めるページに書く`,
    rationale: gap.whyItMatters,
    type: "owned",
    relatedPromptIds: gap.relatedPromptIds,
    relatedPromptCount: gap.relatedPromptCount,
    priority: index === 0 ? "critical" : "high",
    confidence: gap.confidence,
    target: "公開ページ",
    effort: "low",
    audience: discovery.targetCustomers.slice(0, 2).join("・"),
    stage: "比較",
    customerConcern: gap.label,
    placement: "Rovanの公開ページ",
    cta: "記載内容を確認する",
    successMetric: "同じ質問で、御社の名前が答えに出たか",
    evidenceType: "hypothesis",
  }));
  return { gaps, actions };
}

/**
 * 1つの質問に対する模擬の答え。最初は3割台の答えにだけ名前が出る。
 * 週が進むと少し変動し、Rovanの公開ページを公開していると名前が出やすくなる（デモの演出。実際の効果を示すものではない）。
 */
export function demoAnswer(input: { prompt: Pick<BuyerPrompt, "id" | "text">; discovery: CompanyDiscovery; provider: ProviderName; repetition: number; round: number; publishedUrl: string | null }): { rawText: string; citations: Citation[] } {
  const { prompt, discovery, provider, round, publishedUrl } = input;
  const { industry } = demoContext(discovery);
  const brand = discovery.brandName;
  const key = `${brand}|${prompt.id}|${provider}|${input.repetition}`;
  const boost = publishedUrl ? Math.min(0.3, 0.07 * round) : 0.01 * round;
  const jitter = (hash01(`${key}|round${round}`) - 0.5) * 0.16;
  const ownIncluded = hash01(key) < 0.34 + boost + jitter;

  const competitors = [...discovery.competitors]
    .map((competitor, index) => ({ competitor, index, score: hash01(`${prompt.id}|${provider}|${competitor.name}`) - (index < 2 ? 0.35 : 0) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, hash01(`${key}|count`) < 0.5 ? 3 : 4);
  const lines: Array<{ name: string; reason: string; citation?: Citation }> = competitors.map(({ competitor, index }) => {
    const domain = competitor.domain || `candidate-${index + 1}.example`;
    return {
      name: competitor.name,
      reason: industry.reasons[Math.floor(hash01(`${prompt.id}|${competitor.name}|reason`) * industry.reasons.length)],
      citation: { title: `${competitor.name}（架空）`, url: `https://${domain}/`, domain },
    };
  });
  if (ownIncluded) {
    const position = hash01(`${key}|position`) < 0.15 ? 0 : 1 + Math.floor(hash01(`${key}|slot`) * lines.length);
    const citesRovan = Boolean(publishedUrl) && hash01(`${key}|cite`) < 0.6;
    const ownUrl = citesRovan ? publishedUrl! : discovery.domain ? `https://${discovery.domain}/` : "";
    lines.splice(Math.min(position, lines.length), 0, {
      name: brand,
      reason: citesRovan ? "Rovanの公開ページで、強みと条件が出典つきで確認できる" : industry.reasons[Math.floor(hash01(`${key}|own-reason`) * industry.reasons.length)],
      citation: ownUrl ? { title: citesRovan ? `${brand}（Rovanの公開ページ）` : `${brand} 公式サイト`, url: ownUrl, domain: new URL(ownUrl).hostname } : undefined,
    });
  }

  const rawText = [
    "（デモ用の模擬回答です。実際のAIの回答ではありません）",
    `「${prompt.text}」なら、次の${lines.length}件が候補です。`,
    ...lines.map((line, index) => `候補${index + 1} | ${line.name} | ${line.reason}`),
    "利用する前に、最新の営業時間や条件を各店の案内で確認してください。",
  ].join("\n");
  return { rawText, citations: lines.flatMap((line) => (line.citation ? [line.citation] : [])) };
}

const roundStore = globalThis as unknown as { rovanDemoRounds?: Map<string, number> };
const rounds = roundStore.rovanDemoRounds ?? new Map<string, number>();
roundStore.rovanDemoRounds = rounds;

/** 何週目の模擬測定か（最初の診断は0） */
export function demoRound(brandName: string) {
  return rounds.get(brandName) || 0;
}

export function advanceDemoRound(brandName: string) {
  const next = demoRound(brandName) + 1;
  rounds.set(brandName, next);
  return next;
}
