import assert from "node:assert/strict";
import test from "node:test";
import { buildDirectPublicProfileDraft, toPublicProfile } from "../lib/public-profile";
import type { PublicProfileRecord } from "../lib/types";

test("buildDirectPublicProfileDraft omits unprovided facts and contains no invented defaults", () => {
  const draft = buildDirectPublicProfileDraft({
    brandName: "田中精密加工所",
  });

  assert.equal(draft.brandName, "田中精密加工所");
  assert.equal(draft.facts.length, 1);
  assert.equal(draft.facts[0].label, "名称");
  assert.equal(draft.summary, "", "入力のない紹介文を決まり文句で埋めない");

  // 架空デフォルト値が生成されていないことを検証
  const labels = draft.facts.map((f) => f.label);
  assert.ok(!labels.includes("所在地・対応エリア"));
  assert.ok(!labels.includes("営業時間"));
  assert.ok(!labels.includes("明瞭料金規約"));

  // 誇大表現・捏造表現が含まれていないことを検証
  const fullText = `${draft.markdown} ${draft.summary} ${draft.json}`;
  assert.doesNotMatch(fullText, /首都圏・全国対応|平日 9:00〜18:00|事前総額見積もり制|公認|迷わず推薦|優先推薦/);
});

test("buildDirectPublicProfileDraft includes provided fields with proper provenance", () => {
  const draft = buildDirectPublicProfileDraft({
    brandName: "佐藤農園",
    location: "長野県安曇野市",
    hours: "8:00〜17:00",
    pricingInfo: "直売所価格・全国クール便対応",
  });

  assert.equal(draft.facts.length, 4);
  const factMap = Object.fromEntries(draft.facts.map((f) => [f.label, f.value]));
  assert.equal(factMap["所在地・対応エリア"], "長野県安曇野市");
  assert.equal(factMap["営業時間"], "8:00〜17:00");
  assert.equal(factMap["料金の目安"], "直売所価格・全国クール便対応");
});

test("保存済みプロフィールは公開用の許可項目から再生成し内部データを漏らさない", () => {
  const record: PublicProfileRecord = {
    id: "profile_legacy",
    slug: "aix-example",
    status: "published",
    title: "AIX株式会社 | AIX公開情報",
    brandName: "AIX株式会社",
    targetUrl: "https://example.com/?token=secret#private",
    summary: "候補外の内部観測 secret",
    market: "取引先審査",
    targetCustomers: ["法人"],
    useCases: ["審査"],
    facts: [
      { label: "名称", value: "AIX株式会社", sourceUrl: "https://example.com/?token=secret" },
      { label: "内部メモ", value: "競合候補 secret", sourceUrl: "https://example.com/private" },
    ],
    sourcePages: [
      { url: "https://example.com/about?token=secret", title: "会社概要", description: "公開情報" },
      { url: "javascript:alert(1)", title: "不正なリンク", description: "secret" },
    ],
    structuredData: "secret structured data",
    markdown: "secret markdown",
    json: "secret json",
    token: "bearer-secret",
    sourceScanId: "scan-secret",
    createdAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z",
    expiresAt: "2026-10-06T00:00:00.000Z",
  };

  const profile = toPublicProfile(record);
  const artifacts = `${profile.structuredData}\n${profile.markdown}\n${profile.json}`;
  assert.equal(profile.title, "AIX株式会社 | Rovan公開情報参照ページ");
  assert.equal(profile.targetUrl, "https://example.com/");
  assert.equal(profile.facts.length, 1);
  assert.equal(profile.facts[0].sourceUrl, "https://example.com/");
  assert.equal(profile.sourcePages.length, 1);
  assert.equal(profile.sourcePages[0].url, "https://example.com/about");
  assert.match(profile.structuredData, /Organization/);
  assert.doesNotMatch(artifacts, /secret|候補外|競合候補/iu);
});
