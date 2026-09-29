import "server-only";
import { crawlCompanySite, emptyCrawl } from "@/lib/crawler";
import { demoMode } from "@/lib/demo-mode";
import { isNoSiteTarget, noSiteInput } from "@/lib/no-site";
import { discoverCompany, generateBuyerPrompts } from "@/lib/discovery";
import { checkListing } from "@/lib/listing-check";
import { runObservationPanel } from "@/lib/providers";
import { buildScanResult } from "@/lib/scan-result";
import { normalizePublicUrl } from "@/lib/url-security";
import type { BuyerPrompt, PromptPanelKind, ScanProgressEvent } from "@/lib/types";

export async function runScan(input: {
  scanId: string;
  url: string;
  promptCount?: number;
  repetitions?: number;
  panelKind?: PromptPanelKind;
  prompts?: BuyerPrompt[];
  observationConcurrency?: number;
  onProgress?: (event: ScanProgressEvent) => Promise<void> | void;
}) {
  // ホームページなしで名前だけ調べる対象（lib/no-site.ts）は、接続しないのでURLの検査も不要
  const noSite = isNoSiteTarget(input.url);
  const url = noSite ? input.url : normalizePublicUrl(input.url);
  const promptCount = input.promptCount ?? 12;
  const repetitions = input.repetitions ?? 1;
  const panelKind = input.panelKind ?? "free";
  const demo = demoMode();
  const emit = async (stage: ScanProgressEvent["stage"], progress: number, message: string, detail?: string) => {
    // デモでは各段階を少し見せる（本物と同じ進み方を確かめられるように）
    if (demo) await new Promise((resolve) => setTimeout(resolve, 450));
    return input.onProgress?.({ stage, progress, message, detail });
  };

  await emit("validating", 5, noSite ? "お店の名前で調べます。" : "ホームページを開いています。", noSite ? noSiteInput(url) : new URL(url).hostname);
  await emit("crawling", 12, noSite ? "名前と地域を確かめています。" : "ホームページを読んでいます。");
  // デモではサイトを読めなくても止めず、名前だけで調べた扱いにする
  const crawl = noSite ? emptyCrawl() : demo
    ? await crawlCompanySite(url, panelKind === "free" ? 12 : 36).catch(() => emptyCrawl())
    : await crawlCompanySite(url, panelKind === "free" ? 12 : 36);

  await emit("discovering", 30, "比べる相手を探しています。", noSite ? undefined : `${crawl.pages.length}ページを読みました`);
  const discovery = await discoverCompany(url, crawl.pages);

  await emit("prompting", 45, "お客さんが聞きそうな質問をつくっています。", discovery.market);
  const prompts = input.prompts || await generateBuyerPrompts(discovery, promptCount, panelKind);

  await emit("measuring", 55, "AIに聞いています。", `${prompts.length}問`);
  // 電話番号・住所の突き合わせは、AIへの質問と並行して1回だけ行う（失敗しても診断は続ける）
  const [observations, listingCheck] = await Promise.all([
    runObservationPanel({
      prompts,
      discovery,
      repetitions,
      concurrency: input.observationConcurrency,
      onProgress: async (completed, total) => emit("measuring", 55 + Math.round((completed / total) * 25), `AIに聞いています（${completed}/${total}）`, `${completed}/${total}`),
    }),
    checkListing(discovery, crawl.pages).catch(() => ({ status: "unknown" as const, items: [] })),
  ]);

  await emit("analyzing", 84, "結果をまとめています。");
  const result = await buildScanResult({ scanId: input.scanId, targetUrl: url, discovery, prompts, repetitions, panelKind, observations, pages: crawl.pages, crawlAudit: crawl.audit });
  if (listingCheck.status !== "unknown") result.listingCheck = listingCheck;
  await emit("analyzing", 95, "もうすぐ終わります。", discovery.brandName);
  return result;
}
