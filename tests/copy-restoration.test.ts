import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSampleProfile } from "../lib/sample-profiles";

const read = (file: string) => readFileSync(file, "utf8");

test("approved marketing language is restored without replacing the product objective", () => {
  const expected: Record<string, string[]> = {
    "components/brand.tsx": ["生成AI・競合診断"],
    "components/zero-effort-promise-section.tsx": ["社長は、本業（接客・施工・製造・経営）に100%専念してください。", "既存の自社サイトは1文字も触る必要がありません。"],
    "components/product-visuals.tsx": ["手に入るもの 01", "手に入るもの 02", "自社専用 AI診断レポート", "AI推薦データを配備", "毎週のAI回答を自動見守り", "社長の作業", "裏側の自動処理"],
    "app/pricing/page.tsx": ["営業マンを雇う前に。", "AI推薦・自動見守りプラン"],
    "components/result-client.tsx": ["自社専用 AI診断レポート", "今すぐできる解決アクション", "14日間無料で試してみる（メール登録不要）"],
    "components/site-header.tsx": ["② AI推薦データ", "診断結果の見本"],
    "components/site-footer.tsx": ["AIに御社をすすめてもらうためのサービス", "毎週AIの答えを確かめます"],
    "components/scan-form.tsx": ["AI推薦の現状を無料診断"],
    // トップページ（オーナー確定デザイン 2026-09-29、docs/design/top-page/README.md）の承認済み文言
    "components/home/HomeHero.tsx": ["AIに「おすすめは？」と", "Rovanは、AIに御社をすすめてもらうためのサービスです。"],
    "components/home/HomeWhyNow.tsx": ["検索で上位でも、選ばれない時代へ。"],
    "components/home/HomeChange.tsx": ["「この相談なら、御社」。", "AIにそう答えてもらえる会社へ。"],
    "components/home/HomeBenefits.tsx": ["Rovanを使う、3つのメリット"],
    "components/home/HomeNoSite.tsx": ["ホームページがなくても、大丈夫です。"],
    "components/home/HomeSteps.tsx": ["あなたがやるのは、たったこれだけ。"],
    "components/home/HomeFaq.tsx": ["始める前の、よくある疑問"],
    "components/home/HomeDiagnosis.tsx": ["無料の診断で、この3つが分かります。"],
  };
  for (const [file, phrases] of Object.entries(expected)) {
    const source = read(file);
    for (const phrase of phrases) assert.ok(source.includes(phrase), `${file}: missing approved copy ${phrase}`);
  }
});

test("public marketing surfaces do not restore unverified official status or timing guarantees", () => {
  for (const file of ["app/page.tsx", "app/pricing/page.tsx", "app/layout.tsx", "components/product-visuals.tsx", "components/public-profile-actions.tsx", "components/zero-effort-promise-section.tsx", "components/home/HomeHero.tsx", "components/home/HomeWhyNow.tsx", "components/home/HomeChange.tsx", "components/home/HomeBenefits.tsx", "components/home/HomeNoSite.tsx", "components/home/HomeSteps.tsx", "components/home/HomeFaq.tsx", "components/home/HomeDiagnosis.tsx"]) {
    assert.doesNotMatch(read(file), /AI公式推薦|主要5大AI|10秒で即時発行|主要AIが常時自動参照|常時優先巡回/, file);
  }
  assert.match(read("components/public-profile-actions.tsx"), /内容を確認して公開する/);
  assert.match(read("components/public-profile-actions.tsx"), /公開を停止する/);
  assert.match(read("components/zero-effort-promise-section.tsx"), /30日間/);
});

test("specific business examples are segregated fictional profiles, not invented live facts", () => {
  const examples: Record<string, string> = {
    "yamada-bankin": "1〜50個の試作ロット",
    "aoba-cafe": "24席（カウンター8席・テーブル16席）",
    "aoba-souzoku": "初回相談60分無料",
    "azumino-sunshine": "家庭用りんご3kg箱・税込2,800円",
  };
  for (const [slug, value] of Object.entries(examples)) {
    const profile = getSampleProfile(slug);
    assert.ok(profile);
    assert.ok(profile.facts.some((fact) => fact.value.includes(value)));
    assert.equal(JSON.parse(profile.json).sample, true);
    assert.match(profile.markdown, /サンプルデータ/);
    assert.match(profile.sourcePages[0].description || "", /サンプルデータ/);
    assert.ok(new URL(profile.targetUrl).hostname.endsWith(".example"));
  }
  for (const file of ["lib/company-knowledge.ts", "lib/discovery.ts", "lib/positioning.ts", "lib/scan-result.ts"]) {
    for (const value of Object.values(examples)) assert.ok(!read(file).includes(value), `${file}: sample must not become a live fallback`);
  }
});

test("search and machine-readable descriptions retain the same recommendation acquisition purpose", () => {
  const index = JSON.parse(read("public/ai-index.json"));
  assert.match(index.description, /AIからの推薦獲得/);
  assert.match(read("public/llms.txt"), /AIからの推薦獲得/);
  assert.match(read("components/structured-data.tsx"), /AIからの推薦獲得/);
  assert.match(read("app/layout.tsx"), /ChatGPTに、御社はおすすめされていますか？/);
  assert.ok(index.limits.some((limit: string) => limit.includes("保証しない")));
});
