import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * 画面・メールに出る文言に、内部の用語や「AIが書いたような」言い回しを戻さないためのテスト。
 * 基準は docs/UX_REQUIREMENTS.md の「文言の基準」。見せるのは、ユーザーの得になる情報と、法律上必要な情報だけ。
 */

// 画面に出ない部品（どこからも読み込まれていない）と、運営者向けの設定画面・機械向けデータは対象外
const EXCLUDED = new Set([
  "components/product-visuals.tsx",
  "components/zero-effort-promise-section.tsx",
  "components/verified-companies-gallery.tsx",
  "components/executive-diagnostic-summary.tsx",
  "components/positioning-panel.tsx",
  "components/live-activity-ticker.tsx",
  "components/structured-data.tsx",
  "app/setup/page.tsx",
]);

// 画面・メールの文言をつくる lib のファイル
const USER_FACING_LIB = ["lib/watch-email.ts", "lib/value-report.ts", "lib/measurement-readout.ts", "lib/url-security.ts"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // illustrations は git 管理外の使っていない下書き
    if (statSync(path).isDirectory()) return name === "illustrations" ? [] : sourceFiles(path);
    // 画面の部品と、画面にエラーを返す API
    return /\.tsx$/u.test(name) || (path.includes(`${join("app", "api")}`) && name === "route.ts") ? [path] : [];
  });
}

/** コメントは画面に出ないので外す（URL の // は残す） */
function withoutComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(^|\s)\/\/.*$/gmu, "$1");
}

const JA = "[\\u3040-\\u30ff\\u4e00-\\u9fff]";
const BANNED: Array<[RegExp, string]> = [
  [/候補入り|候補外|推薦候補/u, "「名前が出た／出なかった」と言う"],
  [/取得成功|部分観測|比較不可|基準測定|未確定/u, "「取得できず」「くらべられません」「初回」と言う"],
  [/北極星|補助指標|候補回復率/u, "指標の内部名は出さない（名前は「AI顧客奪還シェア」だけ）"],
  [/仮説|検証用|因果|観測|反復|過半数|クロール|差分/u, "内部の分析用語は出さない"],
  [/紐付け|紐づけ|管理権限|掲載維持|対象企業/u, "「つなげる」「管理用リンク」「公開期限の自動延長」「御社」と言う"],
  [/参照元未確認|入力情報（|AI推薦データ|週次見守り|公開情報参照ページ|管理リンク(?!を?コピー)/u, "用語を統一する（公開ページ・毎週の見守り・管理用リンク）"],
  [/することができ|本質的|最適化|シームレス|包括的|革新的|と言えるでしょう|をご確認ください/u, "AIがよく使う冗長・抽象的な言い回しを使わない"],
  [new RegExp(`(?:Watch|Provider|Change Pack|scanId|profileId|token)(?=${JA})|(?<=${JA})(?:Watch|Provider|Change Pack|scanId|profileId|token)`, "u"), "内部の英語名を日本語の文に混ぜない"],
];

test("画面とメールの文言に、内部の用語やAIっぽい言い回しを戻さない", () => {
  const files = [...sourceFiles("app"), ...sourceFiles("components"), ...USER_FACING_LIB]
    .map((path) => path.replaceAll("\\", "/"))
    .filter((path) => !EXCLUDED.has(path));
  assert.ok(files.length > 30, "対象ファイルが見つかること");
  const problems: string[] = [];
  for (const file of files) {
    const lines = withoutComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, index) => {
      for (const [pattern, hint] of BANNED) {
        const match = line.match(pattern);
        if (match) problems.push(`${file}:${index + 1} 「${match[0]}」 → ${hint}`);
      }
    });
  }
  assert.deepEqual(problems, [], problems.join("\n"));
});
