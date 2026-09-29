import "server-only";
import { buildContentQuality } from "@/lib/content-quality";
import { buildDemandProxy } from "@/lib/demand-proxy";
import { analyzeEvidence } from "@/lib/discovery";
import { buildMarketMap } from "@/lib/market-map";
import { citationCoverage, competitorMetrics, firstChoiceRate, lostPrompts, marketPosition, mentionCoverage, recommendationCoverage, repeatAgreement, successful } from "@/lib/measurement";
import { buildAiVisibilityAudit } from "@/lib/visibility-audit";
import { panelVersion } from "@/lib/prompt-panels";
import { derivePositioningAdvice } from "@/lib/positioning";
import { providers } from "@/lib/providers";
import { demoMode } from "@/lib/demo-mode";
import type { BuyerPrompt, CompanyDiscovery, CrawlAudit, CrawledPage, Observation, PromptPanelKind, ScanResult } from "@/lib/types";

export async function buildScanResult(input: {
  scanId: string;
  targetUrl: string;
  discovery: CompanyDiscovery;
  prompts: BuyerPrompt[];
  repetitions: number;
  panelKind: PromptPanelKind;
  observations: Observation[];
  pages: CrawledPage[];
  crawlAudit?: CrawlAudit;
  measuredAt?: string;
}) {
  const eligible = successful(input.observations);
  const scheduledObservations = input.prompts.length * input.repetitions * providers.length;
  const lost = lostPrompts(input.prompts, input.observations, input.discovery);
  const analysis = await analyzeEvidence({ discovery: input.discovery, pages: input.pages, lostPrompts: lost });
  const position = marketPosition(input.observations, input.discovery);
  const warnings: string[] = [];
  if (input.discovery.confidence < .65) warnings.push("会社や市場の情報が少ないため、競合との比較は参考値です。");
  if (eligible.length < scheduledObservations) warnings.push("一部のAI回答を取得できなかったため、取得できた回答だけで結果を表示しています。");
  if (!eligible.length) warnings.push("AIの回答を取得できなかったため、今回の比較結果は表示できません。時間を置いてもう一度お試しください。");
  if (!input.discovery.competitors.length) warnings.push("比較できる会社を十分に見つけられませんでした。市場を確認してからもう一度お試しください。");

  const result: ScanResult = {
    scanId: input.scanId,
    targetUrl: input.targetUrl,
    discovery: input.discovery,
    panel: { kind: input.panelKind, version: panelVersion(input.panelKind), promptCount: input.prompts.length, repetitions: input.repetitions, locale: "ja-JP", country: "JP" },
    prompts: input.prompts,
    measuredAt: input.measuredAt || new Date().toISOString(),
    observations: input.observations,
    scheduledObservations,
    successfulObservations: eligible.length,
    measurementCompleteness: scheduledObservations ? Math.round((eligible.length / scheduledObservations) * 100) : 0,
    recommendationCoverage: recommendationCoverage(input.observations),
    firstChoiceRate: firstChoiceRate(input.observations, input.discovery.brandName),
    mentionCoverage: mentionCoverage(input.observations, input.discovery.aliases),
    citationCoverage: citationCoverage(input.observations, input.discovery.domain),
    repeatAgreement: repeatAgreement(input.observations),
    ownRecommendationCount: eligible.filter((item) => item.ownRecommended).length,
    marketPosition: eligible.length ? position.position : 0,
    marketSize: position.size,
    competitors: competitorMetrics(input.observations, input.discovery),
    lostPrompts: lost,
    evidenceGaps: analysis.gaps,
    actions: analysis.actions,
    totalCostUsd: input.observations.reduce((sum, item) => sum + (item.costUsd || 0), 0),
    warnings,
    ...(demoMode() ? { demo: true } : {}),
  };
  result.visibilityAudit = buildAiVisibilityAudit({ result, pages: input.pages, crawl: input.crawlAudit, generatedAt: result.measuredAt });
  result.marketMap = buildMarketMap({ result, generatedAt: result.measuredAt });
  result.demandProxy = buildDemandProxy({ result, generatedAt: result.measuredAt });
  result.contentQuality = buildContentQuality({ result, pages: input.pages, generatedAt: result.measuredAt });
  result.positioning = derivePositioningAdvice(result);
  return result;
}
