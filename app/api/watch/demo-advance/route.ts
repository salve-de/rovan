import { demoMode } from "@/lib/demo-mode";
import { advanceDemoRound } from "@/lib/providers/demo";
import { getWatch } from "@/lib/storage";
import { processWatchMeasurement } from "@/lib/watch-measurement";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * デモ専用（AIキー未設定の開発環境だけ）：次の週の測定を今すぐ実行して、週次報告の画面を確かめられるようにする。
 * 本番と同じ再測定の処理（processWatchMeasurement）を、模擬の答えを返すAIで動かす。
 */
export async function POST(request: Request) {
  if (!demoMode()) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { token?: string };
  const token = typeof body.token === "string" ? body.token : "";
  const watch = token ? await getWatch(token) : null;
  if (!watch) return Response.json({ error: "週次見守りが見つかりません。" }, { status: 404 });

  advanceDemoRound(watch.latest.discovery.brandName);
  // 質問はまとめて数回に分けて測る設計なので、終わるまで続ける
  for (let step = 0; step < 12; step += 1) {
    const current = await getWatch(token);
    if (!current) break;
    const outcome = await processWatchMeasurement(current);
    if (outcome.status !== "in_progress") return Response.json({ ok: true, status: outcome.status }, { headers: { "cache-control": "no-store" } });
  }
  return Response.json({ error: "測定を最後まで進められませんでした。もう一度お試しください。" }, { status: 500 });
}
