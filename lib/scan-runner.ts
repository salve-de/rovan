import "server-only";
import { crawlCompanySite, emptyCrawl } from "@/lib/crawler";
import { demoMode } from "@/lib/demo-mode";
import { isNoSiteTarget, noSiteInput } from "@/lib/no-site";
import { discoverCompany, generateBuyerPrompts } from "@/lib/discovery";
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

  await emit("validating", 5, noSite ? "ホームページがないため、お店の名前で調べます。" : "サイトにつながるか確認しています。", noSite ? noSiteInput(url) : new URL(url).hostname);
  await emit("crawling", 12, noSite ? "お店の名前と地域から、比べられる相手を整理しています。" : "サービスや導入事例など、会社の公開ページを読んでいます。");
  // デモではサイトを読めなくても止めず、名前だけで調べた扱いにする
  const crawl = noSite ? emptyCrawl() : demo
    ? await crawlCompanySite(url, panelKind === "free" ? 12 : 36).catch(() => emptyCrawl())
    : await crawlCompanySite(url, panelKind === "free" ? 12 : 36);

  await emit("discovering", 30, "比較される市場と会社を整理しています。", `公開ページ ${crawl.pages.length}件`);
  const discovery = await discoverCompany(url, crawl.pages);

  await emit("prompting", 45, "買う前に聞かれる質問を作っています。", discovery.market);
  const prompts = input.prompts || await generateBuyerPrompts(discovery, promptCount, panelKind);

  await emit("measuring", 55, "AIに質問し、選ばれた会社を確認しています。", `${prompts.length}問を確認`);
  const observations = await runObservationPanel({
    prompts,
    discovery,
    repetitions,
    concurrency: input.observationConcurrency,
    onProgress: async (completed, total) => emit("measuring", 55 + Math.round((completed / total) * 25), `AIの回答を確認しています。${completed}/${total}`, `質問 ${completed}/${total}`),
  });

  await emit("analyzing", 84, "AI回答に先に含まれた候補と参照元を整理しています。");
  const result = await buildScanResult({ scanId: input.scanId, targetUrl: url, discovery, prompts, repetitions, panelKind, observations, pages: crawl.pages, crawlAudit: crawl.audit });
  await emit("analyzing", 95, "診断結果を保存しています。", discovery.brandName);
  return result;
}
