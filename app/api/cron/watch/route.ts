import { env } from "@/lib/env";
import { claimDueWatches, updateWatch } from "@/lib/storage";
import { processWatchMeasurement } from "@/lib/watch-measurement";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * 【注意】本エンドポイントは開発検証・手動単発トリガー用の軽量フォールバックです。
 * 本番の10,000社スケール定期バッチ実行は、タイムアウト制限がなく並列分散処理可能な
 * Google Cloud Run Jobs（`scripts/run-weekly-watch.ts` ＋ Cloud Scheduler）が公式正統規格です。
 */
function authorized(request: Request) {
  const header = request.headers.get("authorization") || "";
  return Boolean(env.cronSecret) && header === `Bearer ${env.cronSecret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const due = await claimDueWatches(5, 15 * 60);
  const results: Array<Record<string, unknown>> = [];

  for (const watch of due) {
    try {
      const result = await processWatchMeasurement(watch);
      results.push({ token: watch.token, ...result });
    } catch (error) {
      console.error(`Watch measurement failed for ${watch.token}:`, error);
      const retryAt = new Date(Date.now() + 60 * 60_000).toISOString();
      await updateWatch(watch.token, { nextRunAt: retryAt });
      results.push({ token: watch.token, status: "failed", retryAt, error: "measurement_failed" });
    }
  }

  return Response.json({ processed: results.length, results, generatedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
