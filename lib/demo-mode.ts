import { env } from "@/lib/env";

/**
 * AIキーを設定していない開発サーバー（next dev）では、AIの答えを入力内容に合わせた模擬データで作り、
 * 診断→結果→公開ページ→週次見守りを最後まで操作できるようにする。
 * 本番（next start）とテストでは無効。本番で監査用に使うときだけ ROVAN_DEMO_MODE=1 を明示する。
 * 模擬データの結果には ScanResult.demo が付き、画面に「デモ」と表示される。
 */
export function demoMode() {
  if (env.openAiKey) return false;
  return process.env.NODE_ENV === "development" || process.env.ROVAN_DEMO_MODE === "1";
}

/** 監査で何度も試せるよう、開発サーバーのデモでだけ回数制限を外す */
export function demoRateLimitBypass() {
  return demoMode() && process.env.NODE_ENV === "development";
}
