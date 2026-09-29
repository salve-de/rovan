import test from "node:test";
import assert from "node:assert/strict";
import { sampleResult } from "@/lib/sample-data";
import { derivePositioningAdvice } from "@/lib/positioning";

test("derivePositioningAdvice: 観測候補と確認可能な整理案を導出する", () => {
  const positioning = derivePositioningAdvice(sampleResult);

  assert.ok(positioning.winningAngle, "勝てる看板が存在すること");
  assert.ok(positioning.summary, "解説サマリーが存在すること");

  assert.ok(positioning.competitorWeaknesses.length > 0, "比較候補が1件以上存在すること");
  for (const item of positioning.competitorWeaknesses) {
    assert.ok(item.competitor, "競合名が存在すること");
    assert.match(item.weakness, /取得成功の回答.*候補に含まれ/, "観測された候補の説明が存在すること");
    assert.ok(item.rationale.length > 10, "選ばれる理由が存在すること");
  }

  assert.equal(positioning.actionableMessages.length, 3, "発信文が3チャネル分存在すること");
  const channels = positioning.actionableMessages.map((m) => m.channel);
  assert.ok(channels.includes("profile"), "SNSプロフィール用が存在すること");
  assert.ok(channels.includes("blog"), "ブログ記事用が存在すること");
  assert.ok(channels.includes("flyer"), "チラシ・印刷物用が存在すること");

  for (const msg of positioning.actionableMessages) {
    assert.ok(msg.copy.length > 10, "コピペ用の本文が存在すること");
    assert.ok(msg.instruction.length > 5, "使い方指示が存在すること");
  }

  assert.equal(positioning.strategies?.length, 3, "戦略が3件生成されること");
  const strategy1 = positioning.strategies![0];
  assert.equal(strategy1.code, "強み 01");
  assert.ok(strategy1.name.length > 0);
  assert.equal(strategy1.coreThesis, "", "決まり文句の説明文を作らない");
  assert.ok(strategy1.deliverables.profile.text.includes(sampleResult.discovery.brandName));
  assert.equal(strategy1.competitorAnalysis.length, 0, "顧客層仮説に無関係な競合ログを付けない");
});

test("顧客層・用途・候補外の質問それぞれをニッチ仮説にし、会社の提供事実とは区別する", () => {
  const result = structuredClone(sampleResult);
  result.discovery.targetCustomers = ["夜間に相談したい個人事業主"];
  result.discovery.useCases = ["海外拠点を含む契約の見直し"];
  const advice = derivePositioningAdvice(result);
  const strategies = advice.strategies!;
  assert.match(strategies[0].name, /夜間に相談したい個人事業主/);
  assert.match(strategies[1].name, /海外拠点を含む契約の見直し/);
  assert.ok(strategies[2].name.includes(result.lostPrompts[0].prompt));
  assert.equal(strategies[2].focusKeyword, result.lostPrompts[0].prompt);
  assert.match(strategies[0].strategicReason, /仮説.*未確認/);
  assert.match(strategies[1].strategicReason, /仮説.*参照元/);
  for (const strategy of strategies) {
    assert.match(strategy.deliverables.profile.text, /対象仮説/);
    assert.doesNotMatch(strategy.deliverables.profile.text, /向けの.*。/);
  }
  assert.ok(advice.winningAngle.includes(result.lostPrompts[0].prompt));
});

test("FAQは当該質問の成功ログだけをAI別に保持し、未取得やClaudeの回答を捏造しない", () => {
  const result = structuredClone(sampleResult);
  const loss = result.lostPrompts[0];
  const row = result.observations.find((item) => item.promptId === loss.promptId && !item.ownRecommended)!;
  result.observations = [
    { ...row, provider: "openai", rawText: "取得したOpenAI固有の回答", model: "observed-model", completedAt: "2026-09-07T00:00:00Z" },
    { ...row, id: "failed", provider: "gemini", status: "failed", rawText: "失敗ログの本文は回答ではない" },
  ];
  result.lostPrompts = [loss];
  const faq = derivePositioningAdvice(result).strategicFaqs![0];
  assert.equal(faq.q, row.prompt);
  assert.match(faq.aiObservations.chatgpt, /取得したOpenAI固有の回答/);
  assert.match(faq.aiObservations.chatgpt, /observed-model.*2026-09-07/);
  assert.equal(faq.aiObservations.gemini, "この質問の取得成功ログはありません。");
  assert.equal(faq.aiObservations.perplexity, "この質問の取得成功ログはありません。");
  assert.match(faq.aiObservations.claude, /測定対象外/);
  assert.doesNotMatch(JSON.stringify(faq), /失敗ログの本文/);
  assert.match(faq.canonicalGroundingAnswer, /未確定/);
});

test("実ログにない競合・失敗回答・古い候補外判定から戦略やFAQを作らない", () => {
  const result = structuredClone(sampleResult);
  result.discovery.targetCustomers = [];
  result.discovery.useCases = [];
  result.observations = result.observations.map((row) => ({ ...row, status: "failed" }));
  const advice = derivePositioningAdvice(result);
  assert.deepEqual(advice.strategies, []);
  assert.deepEqual(advice.strategicFaqs, []);
  assert.deepEqual(advice.competitorWeaknesses, []);
  assert.deepEqual(advice.actionableMessages, []);
  assert.match(advice.summary, /確認できません/);
});

test("競合説明は当該質問の観測候補に限定し、discoveryの競合やwinnerを信用しない", () => {
  const result = structuredClone(sampleResult);
  const loss = result.lostPrompts[0];
  const row = result.observations.find((item) => item.promptId === loss.promptId && !item.ownRecommended)!;
  result.observations = [{ ...row, recommendedEntities: ["実ログの候補"], firstCandidate: "実ログの候補" }];
  result.lostPrompts = [{ ...loss, winner: "未観測の大手" }];
  const advice = derivePositioningAdvice(result);
  assert.deepEqual(advice.competitorWeaknesses.map((item) => item.competitor), ["実ログの候補"]);
  assert.doesNotMatch(JSON.stringify(advice), /未観測の大手|画一的|独占/);
  assert.equal(advice.strategies![2].competitorAnalysis[0].name, "実ログの候補");
});
