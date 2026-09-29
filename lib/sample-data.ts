import { buildDemandProxy } from "@/lib/demand-proxy";
import { buildMarketMap } from "@/lib/market-map";
import { derivePositioningAdvice } from "@/lib/positioning";
import { sampleChangePack, enrichSamplePositioning } from "./sample-report-content";
import type {
  ActionCard,
  AiVisibilityAudit,
  BuyerPrompt,
  Citation,
  CompanyDiscovery,
  EvidenceGap,
  Observation,
  ScanResult,
  WatchRecord,
} from "@/lib/types";

/**
 * These values are deterministic fixtures for local UI/tests only.
 * They are not observations from an AI provider, a business directory, or a
 * company website. Keep the warning on every generated result so a fixture
 * cannot be mistaken for a production measurement.
 */
const FIXTURE_WARNING = "画面確認用のサンプルデータです。実在企業の情報・AI回答・推薦・実績を示しません。";
const FIXTURE_SOURCE_NOTE = "見本の固定値。実在企業の評価・比較事実ではありません。";
const FIXTURE_DATE = "2026-09-01T09:00:00.000Z";
const providerNames: Observation["provider"][] = ["openai", "gemini", "perplexity"];

type FixtureCompetitor = { name: string; recommendedCount: number };

type FixtureProfile = {
  market: string;
  summary: string;
  targetCustomers: string[];
  useCases: string[];
  competitors: FixtureCompetitor[];
  promptSeed: Array<[string, BuyerPrompt["cluster"], number]>;
  gaps: Array<Pick<EvidenceGap, "id" | "label" | "whyItMatters" | "confidence" | "status">>;
  actions: Array<Pick<ActionCard, "id" | "title" | "rationale" | "target" | "audience" | "stage" | "customerConcern" | "placement" | "cta" | "successMetric">>;
};

const primaryFixtureCompetitors: FixtureCompetitor[] = [
  { name: "月澄相続パートナーズ", recommendedCount: 21 },
  { name: "花継相続相談社", recommendedCount: 12 },
  { name: "星紡ぎ法務サポート", recommendedCount: 12 },
  { name: "結ノ葉相続事務所", recommendedCount: 12 },
  { name: "灯和遺産整理センター", recommendedCount: 12 },
  { name: "蒼路事業承継社", recommendedCount: 12 },
  { name: "紬野相続サポート", recommendedCount: 9 },
  { name: "和つばさ法務社", recommendedCount: 9 },
  { name: "晴結資産承継室", recommendedCount: 6 },
  { name: "栞月相続相談室", recommendedCount: 6 },
  { name: "結樹遺産手続社", recommendedCount: 6 },
  { name: "朝凪承継パートナーズ", recommendedCount: 6 },
];

const genericFixtureCompetitors: FixtureCompetitor[] = [
  { name: "月澄ビジネスサポート", recommendedCount: 21 },
  { name: "花継ソリューションズ", recommendedCount: 12 },
  { name: "星紡ぎワークス", recommendedCount: 12 },
  { name: "結ノ葉サービス", recommendedCount: 12 },
  { name: "灯和パートナーズ", recommendedCount: 12 },
  { name: "蒼路サポート", recommendedCount: 12 },
  { name: "紬野ビジネス社", recommendedCount: 9 },
  { name: "和つばさワークス", recommendedCount: 9 },
  { name: "晴結ソリューションズ", recommendedCount: 6 },
  { name: "栞月サービス", recommendedCount: 6 },
  { name: "結樹パートナーズ", recommendedCount: 6 },
  { name: "朝凪ビジネス社", recommendedCount: 6 },
];

const primaryPromptSeed: FixtureProfile["promptSeed"] = [
  ["初回60分無料で、相続手続きを相談できる事務所は？", "category", 5],
  ["親族間の遺産分割協議と書類整理をまとめて相談できる窓口は？", "use_case", 5],
  ["不動産と自社株の相続を一緒に整理できる相談先は？", "feature", 5],
  ["初めての相続でも、必要書類を一覧で案内してくれる事務所は？", "implementation", 4],
  ["相続登記の基本料金と追加費用が事前に分かる事務所を比較したい", "comparison", 4],
  ["相続人が遠方でもオンラインで相談を進められる事務所は？", "use_case", 4],
  ["相続登記を基本料金10万円以内で相談できる窓口は？", "value", 4],
  ["相続の手続き範囲と担当者を初回に説明してくれる相談先は？", "trust", 4],
  ["実家の土地と建物の相続について、登記まで相談できる事務所は？", "segment", 3],
  ["遺産分割に必要な書類を2〜4週間で整理する相談ができる窓口は？", "implementation", 3],
  ["平日20時までオンライン相続相談を受け付けている事務所は？", "support", 3],
  ["仕事を休まず、土曜予約で相続手続きを相談できる事務所は？", "category", 3],
];

const genericPromptSeed: FixtureProfile["promptSeed"] = [
  ["この事業者が扱う分野を確認できる公開情報は？", "category", 5],
  ["初めて利用する人が確認したい対象と条件は？", "use_case", 5],
  ["事業者を比較するときに確認できる項目は？", "comparison", 5],
  ["提供内容を確認できる一次情報は？", "feature", 4],
  ["利用前に確認したい手続きや進め方は？", "implementation", 4],
  ["対応範囲を公開情報から確認したい", "segment", 4],
  ["料金や条件を確認するときの注意点は？", "value", 4],
  ["相談先を選ぶ前に確認できる根拠は？", "trust", 4],
  ["受付方法と問い合わせ先を確認できるページは？", "support", 3],
  ["このサービスの利用目的を確認したい", "category", 3],
  ["導入前に確認できる公開資料は？", "implementation", 3],
  ["公開情報を比較して候補を整理したい", "alternative", 3],
];

function fixtureProfile(brandName: string, primary: boolean): FixtureProfile {
  if (primary) {
    return {
      market: "相続・遺産分割・事業承継の専門相談",
      summary: `${brandName}は、相続・遺産分割の書類整理と相続登記を扱う事務所の見本です。初回60分無料、基本料金88,000円（税込）から。平日20時までのオンライン相談と土曜予約に対応する設定です。`,
      targetCustomers: ["相続・遺産分割の相談先を探している人", "事業承継や不動産・自社株の整理を検討している人"],
      useCases: ["親族間の遺産分割協議", "不動産・自社株の円満相続", "相続・遺産分割・事業承継の専門相談"],
      competitors: primaryFixtureCompetitors,
      promptSeed: primaryPromptSeed,
      gaps: [
        { id: "source", label: "ページの更新日", whyItMatters: "公開情報の出どころと更新状況を確認するための項目です。", confidence: 0.5, status: "partial" },
        { id: "scope", label: "対応範囲", whyItMatters: "対象・条件・受付方法を事実と参照元に分けて確認するための項目です。", confidence: 0.5, status: "missing" },
        { id: "process", label: "相談の流れ", whyItMatters: "利用前に確認できる手順が記載されているかを確認するための項目です。", confidence: 0.5, status: "partial" },
      ],
      actions: [
        { id: "action-source", title: "参照元と更新日をそろえる", rationale: "見本の測定ログに対する整理案です。実際の掲載前に参照元を確認してください。", target: "公開情報の整理", audience: "公開情報を確認したい人", stage: "認知", customerConcern: "情報の出どころが分かるか", placement: "公開プロフィール", cta: "参照元を確認する", successMetric: "同じ質問パネルで参照元の変化を確認できるか" },
        { id: "action-scope", title: "対象と対応範囲を明記する", rationale: "見本の測定ログに対する整理案です。未確認の条件は追加しません。", target: "公開情報の整理", audience: "比較条件を確認したい人", stage: "比較", customerConcern: "自分の条件に合うか", placement: "概要・サービス案内", cta: "公開内容を確認する", successMetric: "同じ質問で対象と条件を確認できるか" },
        { id: "action-process", title: "利用手順と問い合わせ方法を明記する", rationale: "見本の測定ログに対する整理案です。実際の手順と一致するか確認してください。", target: "公開情報の整理", audience: "利用前に手順を確認したい人", stage: "検討", customerConcern: "次に何をすればよいか", placement: "手順・問い合わせ", cta: "手順を確認する", successMetric: "同じ質問で受付方法を確認できるか" },
      ],
    };
  }

  return {
    market: "業務サービス（見本）",
    summary: `${brandName || "入力名称"}を表示した画面確認用のサンプルシナリオです。実在の企業情報、業務内容、AI回答、推薦結果ではありません。`,
    targetCustomers: ["公開情報を確認したい人"],
    useCases: ["公開内容の確認", "比較項目の整理", "参照元の確認"],
    competitors: genericFixtureCompetitors,
    promptSeed: genericPromptSeed,
    gaps: [
      { id: "source", label: "ページの更新日", whyItMatters: "公開情報の出どころと更新状況を確認するための項目です。", confidence: 0.5, status: "partial" },
      { id: "scope", label: "対象と条件", whyItMatters: "対象・条件・受付方法を事実と参照元に分けて確認するための項目です。", confidence: 0.5, status: "missing" },
      { id: "process", label: "相談の流れ", whyItMatters: "利用前に確認できる手順が記載されているかを確認するための項目です。", confidence: 0.5, status: "partial" },
    ],
    actions: [
      { id: "action-source", title: "参照元と更新日を確認する", rationale: "見本の測定ログに対する整理案です。実際の掲載前に参照元を確認してください。", target: "公開情報の整理", audience: "公開情報を確認したい人", stage: "認知", customerConcern: "情報の出どころが分かるか", placement: "公開プロフィール", cta: "参照元を確認する", successMetric: "同じ質問パネルで参照元の変化を確認できるか" },
        { id: "action-scope", title: "対象と条件を確認する", rationale: "見本の測定ログに対する整理案です。未確認の条件は追加しません。", target: "公開情報の整理", audience: "比較条件を確認したい人", stage: "比較", customerConcern: "自分の条件に合うか", placement: "概要・サービス案内", cta: "公開内容を確認する", successMetric: "同じ質問で対象と条件を確認できるか" },
        { id: "action-process", title: "利用手順を確認する", rationale: "見本の測定ログに対する整理案です。実際の手順と一致するか確認してください。", target: "公開情報の整理", audience: "利用前に手順を確認したい人", stage: "検討", customerConcern: "次に何をすればよいか", placement: "手順・問い合わせ", cta: "手順を確認する", successMetric: "同じ質問で受付方法を確認できるか" },
      ],
  };
}

function slugFor(brandName: string) {
  const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "sample-company";
}

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function fixtureCitation(name: string, index: number): Citation {
  const candidateSlug = `candidate-${String(index + 1).padStart(2, "0")}`;
  return {
    title: `${name}（見本）`,
    url: `https://${candidateSlug}.example/`,
    domain: `${candidateSlug}.example`,
  };
}

function isCompetitorRecommended(observationIndex: number, planIndex: number, count: number) {
  if (planIndex === 0) {
    // Seven prompts contain the first fixed candidate, which keeps the
    // historical fixture assertion deterministic without claiming a real rank.
    return Math.floor(observationIndex / providerNames.length) < 7;
  }
  // A permutation of 0..35 gives each fixture candidate the requested count.
  return ((observationIndex * 13 + planIndex * 7) % 36) < count;
}

function modal(values: Array<string | null>) {
  const counts = new Map<string, number>();
  values.filter((value): value is string => Boolean(value)).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))[0]?.[0] || null;
}

function fixtureVisibilityAudit(domain: string, measuredAt: string): AiVisibilityAudit {
  return {
    generatedAt: measuredAt,
    readiness: "needs-review",
    priorityCheckId: "structured-data",
    crawl: {
      robotsTxtFound: true,
      sitemapFound: true,
      sitemapUrl: `https://${domain}/sitemap.xml`,
      attempted: 8,
      pagesCrawled: 8,
      pagesBlockedByRobots: 0,
      pagesNoindex: 0,
      pagesMissingCanonical: 2,
      pagesCanonicalMismatch: 0,
      pagesWithStructuredData: 3,
      pagesMissingTitle: 0,
      pagesMissingDescription: 2,
      pagesMissingH1: 0,
      aiSearchBotAllowed: true,
      gptBotAllowed: true,
    },
    checks: [
      { id: "crawler-access", group: "access", status: "ready", title: "公開ページの取得状態", detail: "8ページ中8ページを取得できた例。robots.txtによる遮断は0ページです。", action: "参照元8ページと取得日を保持する" },
      { id: "indexability", group: "access", status: "review", title: "公開範囲", detail: "noindexは0ページ。正規URLの記載がないページが2ページある例です。", action: "Rovan上の公開先と参照元URLを明確にする" },
      { id: "sitemap", group: "access", status: "ready", title: "サイトマップ", detail: "サイトマップに掲載された8ページを確認できた例です。", action: "次回も同じ対象ページの差分を確認する" },
      { id: "structured-data", group: "clarity", status: "review", title: "構造化データ", detail: "8ページ中3ページに構造化データがあり、残り5ページの情報が整理されていない例です。", action: "本文と一致する会社情報・条件をRovanの公開データにまとめる" },
      { id: "entity-clarity", group: "clarity", status: "ready", title: "名称と分野の対応", detail: "トップ・業務案内・料金の3ページで、名称と対応分野が一致している例です。", action: "同じ名称で各参照元を紐付ける" },
      { id: "buyer-facts", group: "clarity", status: "review", title: "確認できる条件", detail: "料金・受付時間・オンライン対応が3ページに分散している例です。", action: "条件と参照元を1つの公開ページで確認できるようにする" },
      { id: "proof", group: "proof", status: "ready", title: "事実の根拠", detail: "料金・受付時間・相談方法を参照元付きで確認できる例です。口コミや未確認の実績は使いません。", action: "各項目の参照元と更新日を掲載する" },
      { id: "measurement", group: "measurement", status: "ready", title: "同じ条件での再測定", detail: "12問を3種類のAIで確認した36回答の例。取得成功36件、欠損0件です。", action: "翌週も同じ12問・3種類のAIで比較する" },
    ],
  };
}

function buildScanResultInternal(brandName: string, scanId: string, measuredAt: string, ownRecommendedIndexes: Set<number>, primary: boolean): ScanResult {
  const displayName = brandName || "入力名称";
  const profile = fixtureProfile(displayName, primary);
  const domain = primary ? "aoba-souzoku.example" : `${slugFor(displayName)}.example`;

  const discovery: CompanyDiscovery = {
    legalName: displayName,
    brandName: displayName,
    domain,
    summary: profile.summary,
    market: profile.market,
    targetCustomers: profile.targetCustomers,
    useCases: profile.useCases,
    aliases: [displayName, domain],
    competitors: profile.competitors.map((candidate, index) => ({
      name: candidate.name,
      domain: `candidate-${String(index + 1).padStart(2, "0")}.example`,
      reason: FIXTURE_SOURCE_NOTE,
      confidence: 0.5,
    })),
    confidence: 0.5,
  };

  const prompts: BuyerPrompt[] = profile.promptSeed.map(([text, cluster, importance], index) => ({
    id: `prompt_${index + 1}`,
    text,
    cluster,
    importance,
    panel: "free",
    version: 1,
  }));

  const observations: Observation[] = prompts.flatMap((prompt, promptIndex) =>
    providerNames.map((provider, providerIndex) => {
      const index = promptIndex * providerNames.length + providerIndex;
      const candidateNames = profile.competitors
        .filter((candidate, candidateIndex) => isCompetitorRecommended(index, candidateIndex, candidate.recommendedCount))
        .map((candidate) => candidate.name);
      const firstCandidate = candidateNames[0] || null;
      const ownRecommended = ownRecommendedIndexes.has(index);
      const recommendedEntities = [...candidateNames, ...(ownRecommended ? [displayName] : [])];
      const ownPosition = ownRecommended ? recommendedEntities.indexOf(displayName) + 1 : null;
      const answer = [
        "【AI回答の見本】",
        `「${prompt.text}」という条件なら、${recommendedEntities.join("、")}が比較候補です。`,
        ownRecommended && primary ? `${displayName}は初回60分無料、相続登記の基本料金88,000円（税込）から。平日20時までのオンライン相談と土曜予約に対応しています。` : "依頼前に、対応範囲・基本料金に含まれる作業・追加費用を各事務所の案内で比較してください。",
        ownRecommended ? "受付方法と必要書類を確認してから、初回相談を予約すると進めやすくなります。" : "",
      ].filter(Boolean).join(" ");

      return {
        id: `obs_${index + 1}`,
        promptId: prompt.id,
        prompt: prompt.text,
        provider,
        model: `fixture-${provider}`,
        repetition: 1,
        status: "success" as const,
        rawText: answer,
        citations: [
          ...(firstCandidate ? [fixtureCitation(firstCandidate, profile.competitors.findIndex((candidate) => candidate.name === firstCandidate))] : []),
          ...(ownRecommended ? [{ title: `${displayName} 相談料金・受付案内`, url: `https://${domain}/consultation`, domain }] : []),
        ],
        recommendedEntities,
        ownRecommended,
        ownPosition,
        firstCandidate,
        startedAt: measuredAt,
        completedAt: measuredAt,
        latencyMs: 0,
        costUsd: 0,
      };
    })
  );

  const successfulObservations = observations.filter((item) => item.status === "success").length;
  const ownRecommendationCount = observations.filter((item) => item.status === "success" && item.ownRecommended).length;
  const competitors = profile.competitors.map((candidate) => {
    const recommendedCount = observations.filter((item) => item.recommendedEntities.includes(candidate.name)).length;
    const firstChoiceCount = observations.filter((item) => item.firstCandidate === candidate.name).length;
    return { name: candidate.name, recommendedCount, firstChoiceCount, coverage: percent(recommendedCount, successfulObservations) };
  });
  const ownCoverage = percent(ownRecommendationCount, successfulObservations);
  const ranked = [...competitors.map((item) => ({ name: item.name, coverage: item.coverage })), { name: displayName, coverage: ownCoverage }]
    .sort((a, b) => b.coverage - a.coverage || a.name.localeCompare(b.name, "ja"));
  const firstChoiceCount = observations.filter((item) => item.firstCandidate === displayName).length;
  const mentionCount = observations.filter((item) => item.rawText.includes(displayName)).length;
  const ownCitationCount = observations.filter((item) => item.citations.some((itemCitation) => itemCitation.domain === domain)).length;

  const lostPrompts = prompts.flatMap((prompt) => {
    const rows = observations.filter((item) => item.promptId === prompt.id && item.status === "success");
    const ownWins = rows.filter((item) => item.ownRecommended).length;
    if (!rows.length || ownWins >= Math.ceil(rows.length / 2)) return [];
    const winner = modal(rows.map((item) => item.firstCandidate).filter((name) => name !== displayName));
    const citations = [...new Map(rows.flatMap((item) => item.citations).map((item) => [item.url, item])).values()];
    return [{
      promptId: prompt.id,
      prompt: prompt.text,
      winner,
      summary: winner ? `${rows.length}件のAI回答のうち自社の候補入りは${ownWins}件。${winner}が先に紹介されています。` : `${rows.length}件のAI回答のうち自社の候補入りは${ownWins}件で、過半数に届いていません。`,
      citations,
      observations: rows,
    }];
  });

  const fullActions: ActionCard[] = profile.actions.map((action, index) => ({
    ...action,
    type: "positioning" as const,
    relatedPromptIds: prompts.slice(0, 8).map((prompt) => prompt.id),
    relatedPromptCount: 8,
    priority: index === 0 ? "critical" as const : index === 1 ? "high" as const : "medium" as const,
    confidence: 0.5,
    effort: "medium" as const,
    evidenceType: "hypothesis" as const,
  }));

  const fullGaps: EvidenceGap[] = profile.gaps.map((gap) => ({
    ...gap,
    relatedPromptIds: prompts.slice(0, 10).map((prompt) => prompt.id),
    relatedPromptCount: 10,
    competitorEvidence: FIXTURE_SOURCE_NOTE,
  }));

  const result: ScanResult = {
    scanId,
    targetUrl: `https://${domain}/`,
    discovery,
    panel: { kind: "free", version: 1, promptCount: prompts.length, repetitions: 1, locale: "ja-JP", country: "JP" },
    prompts,
    measuredAt,
    observations,
    scheduledObservations: prompts.length * providerNames.length,
    successfulObservations,
    measurementCompleteness: percent(successfulObservations, prompts.length * providerNames.length),
    recommendationCoverage: ownCoverage,
    firstChoiceRate: percent(firstChoiceCount, successfulObservations),
    mentionCoverage: percent(mentionCount, successfulObservations),
    citationCoverage: percent(ownCitationCount, successfulObservations),
    repeatAgreement: 0,
    ownRecommendationCount,
    marketPosition: Math.max(1, ranked.findIndex((item) => item.name === displayName) + 1),
    marketSize: ranked.length,
    competitors,
    lostPrompts,
    evidenceGaps: fullGaps,
    actions: fullActions,
    visibilityAudit: fixtureVisibilityAudit(domain, measuredAt),
    // 見本：ネット上の電話番号が、ホームページと違う例（番号・出典はどちらも架空）
    listingCheck: { status: "mismatch", items: [{ field: "phone", site: "022-000-0000", web: "022-000-0001", sourceUrl: `https://maps.example/${domain.split(".")[0]}` }] },
    totalCostUsd: 0,
    warnings: [FIXTURE_WARNING, "12問×3種類のAI＝36回答の表示例です。数値はこのサンプル回答ログから集計しており、50問パネルの実測値ではありません。"],
  };

  result.marketMap = buildMarketMap({ result, generatedAt: measuredAt });
  result.demandProxy = buildDemandProxy({ result, generatedAt: measuredAt });
  result.positioning = derivePositioningAdvice(result);
  if (primary) result.positioning = enrichSamplePositioning(result);
  return result;
}

const baselineOwnRecommended = new Set([0, 1, 3, 6, 9, 12, 33, 34]);
const latestOwnRecommended = new Set([0, 1, 3, 6, 15, 16, 24, 25, 33, 34]);

export const sampleResult: ScanResult = buildScanResultInternal(
  "あおば相続法務事務所",
  "sample_clean_room",
  FIXTURE_DATE,
  baselineOwnRecommended,
  true
);

/**
 * Dynamic samples are generic fixtures, never a copy of the named primary
 * fixture. This keeps `?sample=1&brand=...` useful for layout checks without
 * presenting another company's facts under an arbitrary name.
 */
export function buildDynamicScanResult(brandName: string, measuredAt = FIXTURE_DATE): ScanResult {
  return buildScanResultInternal(brandName.trim() || "入力名称", "sample_dynamic", measuredAt, baselineOwnRecommended, false);
}

export function sampleWatch(brandName?: string): WatchRecord {
  const base = brandName
    ? buildDynamicScanResult(brandName, FIXTURE_DATE)
    : sampleResult;
  const latest = brandName
    ? buildScanResultInternal(brandName.trim() || "入力名称", "sample_dynamic_week_2", "2026-09-08T09:00:00.000Z", latestOwnRecommended, false)
    : buildScanResultInternal("あおば相続法務事務所", "sample_clean_room_week_2", "2026-09-08T09:00:00.000Z", latestOwnRecommended, true);

  return {
    id: "watch_sample",
    token: "sample",
    email: "sample@example.invalid",
    scanId: base.scanId,
    status: "trial",
    paid: false,
    baseline: base,
    latest,
    history: [base, latest],
    changePack: brandName ? undefined : sampleChangePack(latest),
    evidence: [],
    nextRunAt: "2026-09-15T09:00:00.000Z",
    createdAt: base.measuredAt,
    updatedAt: latest.measuredAt,
  };
}
