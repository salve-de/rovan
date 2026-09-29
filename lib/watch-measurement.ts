import "server-only";
import { generateChangePack } from "@/lib/change-pack";
import { crawlCompanySite, emptyCrawl } from "@/lib/crawler";
import { demoMode } from "@/lib/demo-mode";
import { generateBuyerPrompts } from "@/lib/discovery";
import { env } from "@/lib/env";
import { runObservationPanel } from "@/lib/providers";
import { buildScanResult } from "@/lib/scan-result";
import { updateWatch, refreshPublicProfileFromScan, renewBoundPublicProfiles } from "@/lib/storage";
import { sendWatchUpdate } from "@/lib/watch-email";
import { createWatchRun, finalizeWatchRun, getActiveWatchRun, mergeObservations, updateWatchRun } from "@/lib/watch-runs";
import { CORE_PANEL_SIZE } from "@/lib/prompt-panels";
import {
  buildMonthlyValueReport,
  detectCompetitorWebChanges,
  evaluateAutoActionImpact,
  planAndExecuteAutoActions,
} from "@/lib/autonomous-watch";
import type { BuyerPrompt, WatchMeasurementRun, WatchRecord } from "@/lib/types";

import { matchingConsultations } from "@/lib/prompt-evidence";
import { siteUrl } from "@/lib/site";

const DAY_MS = 86_400_000;
const FREE_WATCH_DAYS = 14;

function exactPrompts(watch: WatchRecord): BuyerPrompt[] {
  if (watch.latest.prompts?.length) return watch.latest.prompts;
  const seen = new Map<string, BuyerPrompt>();
  for (const observation of watch.latest.observations) {
    if (!seen.has(observation.promptId)) {
      seen.set(observation.promptId, {
        id: observation.promptId,
        text: observation.prompt,
        cluster: "category",
        importance: 3,
        panel: watch.latest.panel.kind,
        version: watch.latest.panel.version,
      });
    }
  }
  return [...seen.values()];
}

async function ensureRun(watch: WatchRecord) {
  const active = await getActiveWatchRun(watch.id);
  if (active) return active;
  const switchToCore = watch.paid && watch.latest.panel.kind !== "core";
  const prompts = switchToCore ? await generateBuyerPrompts(watch.latest.discovery, CORE_PANEL_SIZE, "core") : exactPrompts(watch);
  if (!prompts.length) throw new Error("再測定に使えるBuyer Promptがありません。");
  return createWatchRun({
    watchId: watch.id,
    watchToken: watch.token,
    targetUrl: watch.latest.targetUrl,
    discovery: watch.latest.discovery,
    prompts,
    panelKind: switchToCore ? "core" : watch.latest.panel.kind,
    repetitions: watch.paid ? 3 : 1,
    switchToCore,
  });
}

function trialExpiredAfterThisRun(watch: WatchRecord) {
  return !watch.paid && watch.status === "trial" && Date.now() >= new Date(watch.createdAt).getTime() + FREE_WATCH_DAYS * DAY_MS;
}

function nextWeeklyRun() {
  return new Date(Date.now() + 7 * DAY_MS).toISOString();
}

function nextResume() {
  return new Date(Date.now() + env.watchResumeMinutes * 60_000).toISOString();
}

function chunkSize(watch: WatchRecord, run: WatchMeasurementRun) {
  return Math.min(run.prompts.length, env.watchPromptBatchSize);
}

export async function processWatchMeasurement(watch: WatchRecord) {
  if (process.env.NODE_ENV === "production" && !(env.supabaseUrl && env.supabaseServiceKey)) {
    throw new Error("Watch requires durable storage in production.");
  }
  await renewBoundPublicProfiles(watch.token);
  let run = await ensureRun(watch);
  const previous = watch.latest;

  if (run.nextPromptIndex < run.prompts.length) {
    const size = chunkSize(watch, run);
    const prompts = run.prompts.slice(run.nextPromptIndex, run.nextPromptIndex + size);
    const observations = await runObservationPanel({
      prompts,
      discovery: run.discovery,
      repetitions: run.repetitions,
      existingObservations: run.observations,
      onCheckpoint: async (rows) => {
        const saved = await updateWatchRun(run.id, { status: "running", observations: mergeObservations(run.observations, rows) });
        if (!saved) throw new Error("Watch測定の途中状態を保存できませんでした。");
        run = saved;
      },
      concurrency: watch.paid ? env.watchObservationConcurrency : Math.min(6, env.watchObservationConcurrency),
    });
    const merged = mergeObservations(run.observations, observations);
    const nextPromptIndex = Math.min(run.prompts.length, run.nextPromptIndex + prompts.length);
    const updatedRun = await updateWatchRun(run.id, { status: "running", observations: merged, nextPromptIndex, error: null });
    if (!updatedRun) throw new Error("Watch測定の途中状態を保存できませんでした。");
    run = updatedRun;

    if (run.nextPromptIndex < run.prompts.length) {
      const resumeAt = nextResume();
      await updateWatch(watch.token, { nextRunAt: resumeAt });
      return {
        status: "in_progress" as const,
        runId: run.id,
        completedPrompts: run.nextPromptIndex,
        totalPrompts: run.prompts.length,
        observations: run.observations.length,
        resumeAt,
      };
    }
  }

  // デモ（AIキー未設定の開発環境）ではサイトを読めなくても週次の結果を作る
  const crawl = demoMode()
    ? await crawlCompanySite(run.targetUrl, run.panelKind === "free" ? 24 : 40).catch(() => emptyCrawl())
    : await crawlCompanySite(run.targetUrl, run.panelKind === "free" ? 24 : 40);
  const result = await buildScanResult({
    scanId: run.id,
    targetUrl: run.targetUrl,
    discovery: run.discovery,
    prompts: run.prompts,
    repetitions: run.repetitions,
    panelKind: run.panelKind,
    observations: run.observations,
    pages: crawl.pages,
    crawlAudit: crawl.audit,
  });
  if (!result.successfulObservations) {
    await updateWatchRun(run.id, { status: "failed", error: "成功したAI観測が0件だったため公開しませんでした。" });
    const retryAt = new Date(Date.now() + 60 * 60_000).toISOString();
    await updateWatch(watch.token, { nextRunAt: retryAt });
    throw new Error("成功したAI観測が0件だったためWatch結果を更新しませんでした。");
  }

  const changePack = watch.paid
    ? await generateChangePack({ result, pages: crawl.pages, evidence: watch.evidence }).catch(() => null)
    : null;

  // Phase 3〜5: 観測候補の差分、公開前確認案、再測定検証、月次レポート生成
  let competitorEvents = watch.competitorEvents;
  let autoActions = watch.autoActions;
  let autoActionImpacts = watch.autoActionImpacts;
  let monthlyReport = watch.monthlyReport;
  const history = run.switchToCore ? [result] : [...watch.history, result].slice(-52);

  if (watch.paid) {
    const detectedEvents = detectCompetitorWebChanges(result, previous);
    const planned = planAndExecuteAutoActions({
      targetUrl: result.targetUrl,
      events: detectedEvents,
      crawledPages: crawl.pages,
    });

    const previousActions = watch.autoActions || [];
    const impacts = previousActions.flatMap(action => {
      const before = [watch.baseline, ...watch.history].find(scan => scan.scanId === action.beforeScanId);
      return evaluateAutoActionImpact([action], result, before);
    });

    if (detectedEvents.length) competitorEvents = detectedEvents;
    if (planned.actions.length) autoActions = planned.actions;
    autoActionImpacts = impacts;

    const refreshed = await refreshPublicProfileFromScan(watch.token, result, crawl.pages);
    if (refreshed.length) {
      const executed = refreshed.map((profile) => ({
        id: `profile_${profile.id}_${result.scanId}`,
        triggerEventIds: [],
        actionType: "profile_fact_updated" as const,
        factLabel: "公開情報の自動更新",
        factValue: `${profile.automation?.changedFactCount || 0}件の記載差分を反映`,
        sourceUrl: profile.targetUrl,
        beforeScanId: result.scanId,
        publishedUrl: `${siteUrl}/ai/company/${encodeURIComponent(profile.slug)}`,
        addedFacts: profile.facts.filter(f => !(profile.automation?.previousFacts || []).some(old => old.label === f.label && old.value === f.value && old.sourceUrl === f.sourceUrl)),
        removedFacts: (profile.automation?.previousFacts || []).filter(f => !profile.facts.some(next => next.label === f.label && next.value === f.value && next.sourceUrl === f.sourceUrl)),
        affectedPromptIds: [...new Set(profile.facts.filter(f => !(profile.automation?.previousFacts || []).some(old => old.value === f.value && old.sourceUrl === f.sourceUrl)).flatMap(f => matchingConsultations(f, result.prompts || [])))],
        summary: "許可された参照元の記載をRovan公開ページへ反映しました。変更履歴から直前の更新を取り消せます。AI回答への影響は次回測定で確認します。",
        status: "applied" as const,
        executedAt: profile.automation!.lastUpdatedAt,
      }));
      autoActions = [...executed, ...(autoActions || []).filter((action) => !executed.some((next) => next.id === action.id))].slice(0, 52);
    }

    monthlyReport = buildMonthlyValueReport({
      latest: result,
      previous,
      history,
      competitorEvents,
      autoActions,
      impacts: autoActionImpacts,
    });
  }

  const expiresAfterRun = trialExpiredAfterThisRun(watch);
  const baseline = run.switchToCore ? result : watch.baseline;
  const status = expiresAfterRun ? "expired" as const : watch.status;
  const enriched = await updateWatch(watch.token, {
    changePack,
    competitorEvents,
    autoActions,
    autoActionImpacts,
    monthlyReport,
  });
  if (!enriched) throw new Error("Watchの分析結果を保存できませんでした。");
  const updated = await finalizeWatchRun({ run, latest: result, baseline, history, status, nextRunAt: nextWeeklyRun() });

  // Notification failure must not reschedule and charge for an already committed measurement.
  let notificationFailed = false;
  try {
    await sendWatchUpdate(updated, previous, { trialEnded: expiresAfterRun });
  } catch {
    notificationFailed = true;
  }
  return {
    status: expiresAfterRun ? "completed_and_expired" as const : run.switchToCore ? "core_baseline_created" as const : "completed" as const,
    runId: run.id,
    completedPrompts: run.prompts.length,
    totalPrompts: run.prompts.length,
    observations: run.observations.length,
    changePackItems: updated.changePack?.items.length || 0,
    notificationFailed,
  };
}
