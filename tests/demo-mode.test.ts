import assert from "node:assert/strict";
import test from "node:test";
import { demoQuestionSeeds, detectIndustry, GENERIC_INDUSTRY, regionFromText, splitNameAndRegion } from "../lib/demo/catalog";
import { demoAnswer, demoContext, demoDiscovery } from "../lib/demo/engine";
import { isNoSiteTarget, noSiteInput, noSiteTarget } from "../lib/no-site";
import { extractRecommendedEntities } from "../lib/entity-extraction";

test("デモ：名前と地域を分け、業種を推定する", () => {
  assert.deepEqual(splitNameAndRegion("青葉ベーカリー 高崎"), { name: "青葉ベーカリー", region: "高崎" });
  assert.deepEqual(splitNameAndRegion("山田板金　大田区"), { name: "山田板金", region: "大田区" });
  assert.deepEqual(splitNameAndRegion("@aoba_bakery"), { name: "aoba_bakery", region: "" });
  // 業種の語や会社の種類は地域として扱わない
  assert.equal(splitNameAndRegion("青葉 ベーカリー").region, "");
  assert.equal(splitNameAndRegion("株式会社 山田").region, "");
  assert.equal(regionFromText("所在地：群馬県高崎市八島町1-2"), "高崎市");
  assert.equal(detectIndustry("aoba_bakery").id, "bakery");
  assert.equal(detectIndustry("山田板金").id, "construction");
  assert.equal(detectIndustry("山田自動車板金塗装").id, "auto");
  assert.equal(detectIndustry("ABC商事 新宿"), GENERIC_INDUSTRY);
});

test("デモ：無料診断の12問は地域と業種を含む", () => {
  const seeds = demoQuestionSeeds(detectIndustry("パン"), "高崎");
  assert.equal(seeds.length, 12);
  assert.ok(seeds.every(([text]) => text.includes("パン屋")));
  assert.equal(seeds[0][0], "高崎でおすすめのパン屋は？");
  assert.equal(demoQuestionSeeds(detectIndustry("パン"), "")[0][0], "近くでおすすめのパン屋は？");
});

test("デモ：名前だけの診断対象は外部に接続しない予約ドメインで、入力を取り戻せる", () => {
  const target = noSiteTarget("山田板金 大田区");
  assert.ok(isNoSiteTarget(target));
  assert.equal(new URL(target).hostname, "no-site.invalid");
  assert.equal(noSiteInput(target), "山田板金 大田区");
  assert.ok(!isNoSiteTarget("https://example.com/"));
});

test("デモ：模擬の答えは本物と同じ形式で読み取れ、候補名は架空で毎回同じ", () => {
  const discovery = demoDiscovery(noSiteTarget("山田板金 大田区"), []);
  assert.equal(discovery.brandName, "山田板金");
  assert.equal(discovery.market, "大田区のリフォーム業者");
  assert.deepEqual(demoContext(discovery).region, "大田区");
  assert.equal(discovery.competitors.length, 8);
  assert.ok(discovery.competitors.every((item) => item.domain?.endsWith(".example")));
  const input = { prompt: { id: "p1", text: "大田区でおすすめのリフォーム業者は？" }, discovery, provider: "openai" as const, repetition: 1, round: 0, publishedUrl: null };
  const answer = demoAnswer(input);
  assert.deepEqual(demoAnswer(input), answer);
  assert.match(answer.rawText, /模擬回答/);
  const entities = extractRecommendedEntities(answer.rawText, discovery);
  assert.ok(entities.length >= 3);
  assert.ok(entities.every((name) => name === "山田板金" || discovery.competitors.some((item) => item.name === name)));
  assert.ok(answer.citations.every((item) => item.domain.endsWith(".example")));
});
