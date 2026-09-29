import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sampleWatch } from "../lib/sample-data";
import { toPublicWatch } from "../lib/public-dto";
import { northStarShare } from "../lib/north-star";
import { takeBackShare } from "../lib/measurement";
import * as measurementReadout from "../lib/measurement-readout";
import type { ScanResult, WatchRecord } from "../lib/types";
import { ExecutiveDiagnosticSummary } from "../components/executive-diagnostic-summary";

const nativeRequire = createRequire(import.meta.url);

// Execute the real presentation modules with sealed imports and fake delivery.
// Never load environment secrets, storage, browser state or a live provider.
function load(file: string, mocks: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const loaded = { exports: {} as Record<string, (...args: any[]) => any> };
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, URL, URLSearchParams, Intl, Response,
    require: (name: string) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "react/jsx-runtime") return nativeRequire(name);
      throw new Error(`Unexpected import: ${name}`);
    },
    ...globals,
  }, { filename: file });
  return loaded.exports;
}

function renderWatch(watch: WatchRecord) {
  const empty = () => null;
  const loadedComponent = load("components/watch-client.tsx", {
    react: React,
    "next/link": { default: ({ children }: { children: React.ReactNode }) => React.createElement("a", null, children) },
    "next/navigation": { useSearchParams: () => new URLSearchParams("sample=1") },
    "@/components/icons": { ArrowIcon: empty, WarningIcon: empty },
    "@/components/site-header": { SiteHeader: empty },
    "@/components/site-footer": { SiteFooter: empty },
    "@/components/profile-automation-controls": { ProfileAutomationControls: empty },
    "@/components/value-proof-board": { ValueProofBoard: empty },
    "@/components/executive-referral-card": { ExecutiveReferralCard: empty },
    "@/lib/public-dto": { toPublicWatch },
    "@/lib/sample-value-proof": { sampleValueWatch: () => watch },
    "@/lib/measurement-readout": measurementReadout,
  });
  return renderToStaticMarkup(React.createElement(loadedComponent.WatchClient));
}

test("Watch renders newly included recommendations, not real customer gains", () => {
  const html = renderWatch(sampleWatch());
  assert.match(html, /2問で、新しく名前が出ました。/);
  assert.doesNotMatch(html, /顧客を[0-9]+人獲得|ライバル排除/);
});

test("Watch does not show success when unchanged, declined or incomparable", () => {
  const unchanged = sampleWatch();
  unchanged.latest = structuredClone(unchanged.baseline);
  assert.match(renderWatch(unchanged), /今週は、名前が出た数に変化はありませんでした。/);
  const declined = sampleWatch();
  [declined.baseline, declined.latest] = [declined.latest, declined.baseline];
  const down = renderWatch(declined);
  assert.match(down, /2問で、名前が出なくなりました。/);
  assert.doesNotMatch(down, /問で、新しく名前が出ました。/);
  const incomparable = sampleWatch();
  incomparable.latest.panel.version += 1;
  const unpaired = renderWatch(incomparable);
  assert.match(unpaired, /初回とくらべられませんでした。/);
  assert.doesNotMatch(unpaired, /問で、新しく名前が出ました。/);
});

test("incomplete Watch results do not turn missing answers into recommendation wins", () => {
  const watch = sampleWatch();
  watch.latest.measurementCompleteness = 0;
  watch.latest.observations = [];
  watch.latest.lostPrompts = [];
  const html = renderWatch(watch);
  assert.match(html, /初回とくらべられませんでした。/);
  assert.doesNotMatch(html, /問で、新しく名前が出ました。/);
  // 補助の数字（名前が出た質問・出なかった質問・参照元）の欄
  const summary = html.match(/<div class="wt-stats">([\s\S]*?)<p class="wt-note">/)?.[1] || "";
  assert.match(summary, /未測定|取得できず|まだ測れていません/);
});

test("stopped Watch does not promise an upcoming weekly run", () => {
  for (const status of ["expired", "cancelled", "past_due"] as const) {
    const watch = sampleWatch();
    watch.status = status;
    const html = renderWatch(watch);
    assert.doesNotMatch(html, /次週も同じパネル・条件でAI回答の変化を記録します。/);
    assert.doesNotMatch(html, /次回巡回 /);
    assert.doesNotMatch(html, /AI推薦状況の変化を通知中/);
  }
});

function emailHarness() {
  const sent: Array<{ subject: string; text: string; html: string }> = [];
  const loadedEmail = load("lib/watch-email.ts", {
    "server-only": {},
    "@/lib/brand": { brandedEmailSender: (value: string) => value },
    "@/lib/north-star": { northStarShare },
    "@/lib/measurement": { takeBackShare },
    "@/lib/measurement-readout": measurementReadout,
    "@/lib/ids": { shortHash: () => "fixture-id" },
    "@/lib/env": { env: { resendApiKey: "fixture-only", watchFromEmail: "fixture@example.com", siteUrl: "https://example.com" } },
  }, {
    fetch: async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return Response.json({ id: "not-a-real-delivery" });
    },
  });
  return { module: loadedEmail, sent };
}

test("Watch mail preserves no-change silence and distinguishes trial ending", async () => {
  const h = emailHarness();
  const watch = sampleWatch();
  watch.email = "fixture@example.com";
  watch.latest = structuredClone(watch.baseline);
  const result = await h.module.sendWatchUpdate(watch, watch.baseline);
  assert.equal(result.reason, "no_meaningful_change");
  assert.equal(h.sent.length, 0);
  await h.module.sendWatchUpdate(watch, watch.baseline, { trialEnded: true });
  assert.equal(h.sent.length, 1);
  assert.match(h.sent[0].subject, /無料期間（14日間）が終了/);
  assert.match(h.sent[0].html, /自動で課金はされません/);
  assert.doesNotMatch(h.sent[0].html, /新しく名前が出ました。/);
});

test("Watch mail distinguishes source-only changes from recommendation changes", async () => {
  const h = emailHarness();
  const watch = sampleWatch();
  watch.email = "fixture@example.com";
  watch.latest = structuredClone(watch.baseline);
  watch.latest.observations[0].citations.push({ url: "https://source.example/new", domain: "source.example", title: "Fixture source" });
  await h.module.sendWatchUpdate(watch, watch.baseline);
  assert.equal(h.sent.length, 1);
  assert.match(h.sent[0].subject, /参考にしたページが変わりました/);
  assert.match(h.sent[0].text, /参考にしたページ/);
  assert.doesNotMatch(h.sent[0].text, /新しく名前が出た質問：[1-9]/);
});

test("failed AI responses produce an incomplete-comparison notice, not recommendation loss", async () => {
  const h = emailHarness();
  const watch = sampleWatch();
  watch.email = "fixture@example.com";
  watch.latest = structuredClone(watch.baseline);
  watch.latest.measurementCompleteness = 0;
  watch.latest.observations = [];
  watch.latest.lostPrompts = [];
  await h.module.sendWatchUpdate(watch, watch.baseline);
  assert.equal(h.sent.length, 1);
  assert.match(h.sent[0].text, /くらべられません/);
  assert.doesNotMatch(h.sent[0].text, /名前が出なくなった質問：/);
  assert.doesNotMatch(h.sent[0].subject, /新しく名前が出ました|名前が出なくなりました/);
});

test("Watch mail explains a changed region instead of giving the normal recovery definition", async () => {
  const h = emailHarness();
  const watch = sampleWatch();
  watch.email = "fixture@example.com";
  // Exercise a stored/foreign panel outside the current JP-only UI type.
  Object.assign(watch.latest.panel, { country: "US" });
  await h.module.sendWatchUpdate(watch, watch.baseline);
  assert.equal(h.sent.length, 1);
  assert.match(h.sent[0].text, /地域・言語がちがうため/);
  assert.doesNotMatch(h.sent[0].subject, /新しく名前が出ました|名前が出なくなりました/);
});

function renderResult(result: ScanResult) {
  const empty = () => null;
  const mocks: Record<string, unknown> = {
    react: React,
    "next/link": { default: ({ children }: { children: React.ReactNode }) => React.createElement("a", null, children) },
    "next/navigation": { useSearchParams: () => new URLSearchParams("sample=1"), useRouter: () => ({ push: empty }) },
    "@/lib/sample-data": { sampleResult: result },
    "@/lib/no-site": { isNoSiteTarget: () => false },
    "@/lib/measurement-readout": measurementReadout,
    "@/lib/pricing": { WATCH_MONTHLY_PRICE_LABEL: "¥19,800" },
    "@/components/executive-diagnostic-summary": { ExecutiveDiagnosticSummary },
    "@/components/icons": { ArrowIcon: empty, QuoteIcon: empty },
  };
  for (const [file, name] of [["site-header", "SiteHeader"], ["site-footer", "SiteFooter"], ["citation-map", "CitationMap"], ["question-list", "QuestionList"], ["report-actions", "ReportActions"], ["positioning-panel", "PositioningPanel"], ["public-profile-actions", "PublicProfileActions"]]) mocks[`@/components/${file}`] = { [name]: empty };
  const loadedResult = load("components/result-client.tsx", mocks);
  return renderToStaticMarkup(React.createElement(loadedResult.ResultClient));
}

test("result, Watch and started mail use the same majority question count for opposite providers", async () => {
  const watch = sampleWatch();
  watch.latest = structuredClone(watch.baseline);
  // Every question has one yes and two no answers: any-provider OR would inflate all questions.
  for (const row of watch.latest.observations) row.ownRecommended = row.provider === "openai";
  const readout = measurementReadout.measurementReadout(watch.latest);
  assert.equal(readout.included, 0);
  assert.equal(readout.excluded, watch.latest.panel.promptCount);
  const resultHtml = renderResult(watch.latest);
  const watchHtml = renderWatch(watch);
  const h = emailHarness();
  await h.module.sendWatchStarted({ ...watch, email: "fixture@example.com" });
  for (const output of [resultHtml, watchHtml, h.sent[0].text, h.sent[0].html]) assert.ok(output.includes(readout.label), readout.label);
});

test("competitor-only newcomer alerts in Watch and mail, including candidates beyond top five", async () => {
  const watch = sampleWatch();
  watch.latest = structuredClone(watch.baseline);
  watch.latest.observations[0].recommendedEntities.push("新しい専門業者");
  const html = renderWatch(watch);
  assert.match(html, /変化あり/);
  assert.match(html, /新しい専門業者/);
  assert.match(html, /今回はじめて/);
  const h = emailHarness();
  await h.module.sendWatchUpdate({ ...watch, email: "fixture@example.com" }, watch.baseline);
  assert.equal(h.sent.length, 1);
  assert.match(h.sent[0].text, /新しい専門業者: 今回はじめて/);
});

test("opposite-provider swaps alert even when overall count and competitor coverage are unchanged", async () => {
  const watch = sampleWatch();
  watch.baseline.observations[0].ownRecommended = true;
  watch.baseline.observations[1].ownRecommended = false;
  watch.latest = structuredClone(watch.baseline);
  watch.latest.observations[0].ownRecommended = false;
  watch.latest.observations[1].ownRecommended = true;
  const comparison = measurementReadout.compareMeasurementReadouts(watch.baseline, watch.latest);
  assert.equal(comparison.before.included, comparison.after.included);
  assert.equal(comparison.answerChanged, true);
  assert.match(renderWatch(watch), /AIがすすめる会社が変わりました/);
  const h = emailHarness();
  await h.module.sendWatchUpdate({ ...watch, email: "fixture@example.com" }, watch.baseline);
  assert.equal(h.sent.length, 1);
});

test("three-week Watch labels its baseline as initial while email identifies its actual previous run", async () => {
  const watch = sampleWatch();
  watch.baseline.measuredAt = "2026-09-01T09:00:00.000Z";
  const previous = structuredClone(watch.baseline);
  previous.measuredAt = "2026-09-08T09:00:00.000Z";
  watch.latest.measuredAt = "2026-09-15T09:00:00.000Z";
  watch.history = [watch.baseline, previous, watch.latest];
  const html = renderWatch(watch);
  assert.match(html, /初回/);
  assert.doesNotMatch(html, /前回/);
  const h = emailHarness();
  await h.module.sendWatchUpdate({ ...watch, email: "fixture@example.com" }, previous);
  assert.match(h.sent[0].text, /前回（2026\/09\/08/);
});

test("empty ChangePack and incomplete or old stored data have explicit non-zero-assumption states", () => {
  const watch = sampleWatch();
  if (watch.changePack) watch.changePack.items = [];
  assert.match(renderWatch(watch), /まだ案はありません/);
  watch.latest.observations = watch.latest.observations.filter((row) => row.promptId !== watch.latest.prompts![0].id);
  watch.latest.measurementCompleteness = 90;
  const readout = measurementReadout.measurementReadout(watch.latest);
  assert.equal(readout.missing, 1);
  assert.match(renderWatch(watch), /1問は答えを取得できず/);
  assert.match(renderResult(watch.latest), /1問は答えを取得できず/);
  const comparison = measurementReadout.compareMeasurementReadouts(watch.baseline, watch.latest);
  assert.equal(comparison.comparable, false);
  assert.ok(comparison.competitorMovements.every((row) => row.diff === null));
  watch.latest.prompts = undefined;
  assert.equal(measurementReadout.measurementReadout(watch.latest).successful, 0);
  assert.match(renderWatch(watch), /未測定/);
});
