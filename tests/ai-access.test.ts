import assert from "node:assert/strict";
import test from "node:test";
import { aiAccessFixText, probeBlocked, summarizeAiAccess } from "../lib/ai-access";
import { isAllowedByRobots } from "../lib/robots";
import type { AiVisibilityAudit, CrawlAudit } from "../lib/types";

const crawl = (overrides: Partial<CrawlAudit> = {}): CrawlAudit => ({
  robotsTxtFound: true, sitemapFound: true, attempted: 3, pagesCrawled: 3, pagesBlockedByRobots: 0, pagesNoindex: 0,
  pagesMissingCanonical: 0, pagesCanonicalMismatch: 0, pagesWithStructuredData: 0, pagesMissingTitle: 0, pagesMissingDescription: 0,
  pagesMissingH1: 0, aiSearchBotAllowed: true, gptBotAllowed: true, ...overrides,
});
const audit = (c: CrawlAudit, homeNoindex = false): AiVisibilityAudit => ({
  generatedAt: "2026-09-29T00:00:00.000Z", readiness: "ready", priorityCheckId: "", crawl: c,
  checks: [{ id: "indexability", group: "access", status: homeNoindex ? "missing" : "ready", title: "", detail: "", action: "" }],
});

test("ファイアウォールでの門前払いを見分ける（Cloudflareのチャレンジも含む）", () => {
  assert.equal(probeBlocked(403, new Headers()), true);
  assert.equal(probeBlocked(200, new Headers({ "cf-mitigated": "challenge" })), true);
  assert.equal(probeBlocked(200, new Headers()), false);
  assert.equal(probeBlocked(429, new Headers()), false, "回数制限は遮断と決めつけない");
});

test("robots.txt で Google-Extended だけ止めると、Gemini が読めない設定として出す", () => {
  const robots = "User-agent: Google-Extended\nDisallow: /\n\nUser-agent: *\nAllow: /";
  assert.equal(isAllowedByRobots(robots, "/", "Google-Extended"), false);
  assert.equal(isAllowedByRobots(robots, "/", "Googlebot"), true);
  const summary = summarizeAiAccess(audit(crawl({ crawlerAccess: { "Google-Extended": false, Googlebot: true, "OAI-SearchBot": true } })));
  assert.equal(summary?.status, "blocked");
  assert.deepEqual(summary?.blocked, [{ ai: "Gemini", by: "robots" }]);
  assert.match(aiAccessFixText(summary!, "https://example.com/"), /User-agent: Google-Extended/);
});

test("ファイアウォールで止まっていれば、その直し方（Cloudflare）を文面に入れる", () => {
  const summary = summarizeAiAccess(audit(crawl({ firewall: { cdn: "cloudflare", tested: ["OAI-SearchBot", "PerplexityBot"], blocked: ["OAI-SearchBot", "PerplexityBot"] } })));
  assert.deepEqual(summary?.blocked.map((item) => `${item.ai}:${item.by}`), ["ChatGPT:firewall", "Perplexity:firewall"]);
  const text = aiAccessFixText(summary!, "https://example.com/");
  assert.match(text, /Cloudflare/);
  assert.doesNotMatch(text, /robots\.txt/, "robots が原因でないなら robots の直し方は出さない");
});

test("Cloudflare を使っているが確かめきれないときは「念のため確認」、問題なければ ok、読んでいなければ出さない", () => {
  assert.equal(summarizeAiAccess(audit(crawl({ firewall: { cdn: "cloudflare", tested: ["OAI-SearchBot"], blocked: [] } })))?.status, "check");
  assert.equal(summarizeAiAccess(audit(crawl({ firewall: { cdn: null, tested: ["OAI-SearchBot"], blocked: [] } })))?.status, "ok");
  assert.equal(summarizeAiAccess(audit(crawl({ pagesCrawled: 0 }))), null, "ホームページを読んでいない（名前だけの診断など）ときは判定しない");
  assert.equal(summarizeAiAccess(undefined), null);
});

test("トップページの noindex も、読めない設定として知らせる", () => {
  const summary = summarizeAiAccess(audit(crawl(), true));
  assert.equal(summary?.status, "blocked");
  assert.equal(summary?.homeNoindex, true);
  assert.match(aiAccessFixText(summary!, "https://example.com/"), /noindex/);
});
