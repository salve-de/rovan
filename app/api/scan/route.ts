import { consumeFreeScan } from "@/lib/rate-limit";
import { runScan } from "@/lib/scan-runner";
import { createScan, getRecentCompletedScan, updateScan } from "@/lib/storage";
import { normalizePublicUrl } from "@/lib/url-security";
import { FREE_PANEL_SIZE } from "@/lib/prompt-panels";
import { env } from "@/lib/env";
import { demoMode } from "@/lib/demo-mode";
import { noSiteTarget } from "@/lib/no-site";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function ndjsonResponse(run: (emit: (payload: unknown) => void, close: () => void) => void | Promise<void>) {
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (payload: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };
      await run(emit, () => {
        if (!closed) { closed = true; controller.close(); }
      });
    },
    cancel() { closed = true; },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no", "referrer-policy": "no-referrer" } });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && !(env.supabaseUrl && env.supabaseServiceKey)) {
    return Response.json({ error: "診断の保存先を準備中です。時間を置いてお試しください。" }, { status: 503 });
  }
  // AIキー未設定の開発環境では、AIの答えを入力に合わせた模擬データで作るデモとして最後まで動かす（lib/demo-mode.ts）
  const demo = demoMode();
  if (!env.openAiKey && !demo) {
    return Response.json({ error: "診断に必要なAI接続を準備中です。時間を置いてお試しください。" }, { status: 503 });
  }
  let targetUrl: string;
  try {
    const body = await request.json() as { url?: string; name?: string };
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    // ホームページなしで名前だけ調べる診断は、いまはデモでだけ使える（本番のAI接続での対応は今後）
    if (!body.url && name && demo) targetUrl = noSiteTarget(name);
    else if (!body.url && name) return Response.json({ error: "ホームページなしの診断は、先に御社のページの下書きをつくってから行います。" }, { status: 400 });
    else targetUrl = normalizePublicUrl(body.url || "");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "URLが不正です。" }, { status: 400 });
  }

  const cached = demo ? null : await getRecentCompletedScan(targetUrl, 10 * 60_000).catch(() => null);
  if (cached?.stage === "complete" && cached.result) {
    return ndjsonResponse((emit, close) => {
      emit({ type: "accepted", scanId: cached.id, reused: true });
      emit({ type: "progress", scanId: cached.id, stage: cached.stage, progress: 100, message: "前回の確認結果を表示します。", detail: "結果を準備しました" });
      emit({ type: "complete", scanId: cached.id, reused: true });
      close();
    });
  }

  const limit = await consumeFreeScan(request, targetUrl);
  if (!limit.allowed) return Response.json({ error: "無料診断の利用上限に達しました。時間を空けて再度お試しください。" }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });

  const scan = await createScan(targetUrl);
  return ndjsonResponse(async (emit, close) => {
    emit({ type: "accepted", scanId: scan.id });
    try {
      const result = await runScan({
        scanId: scan.id,
        url: targetUrl,
        promptCount: FREE_PANEL_SIZE,
        repetitions: 1,
        panelKind: "free",
        onProgress: async (event) => {
          const saved = await updateScan(scan.id, { stage: event.stage, progress: event.progress, message: event.message });
          if (!saved) throw new Error("診断の進行状況を保存できませんでした。");
          emit({ type: "progress", scanId: scan.id, ...event });
        },
      });
      const stage = result.successfulObservations > 0 && result.successfulObservations === result.scheduledObservations ? "complete" : "partial";
      const saved = await updateScan(scan.id, { stage, progress: 100, message: "結果と、最初に直すことをまとめました。", result, error: null });
      if (!saved?.result) throw new Error("診断結果を保存できませんでした。");
      emit({ type: "complete", scanId: scan.id });
    } catch {
      const message = "診断を完了できませんでした。時間を置いて再度お試しください。";
      await updateScan(scan.id, { stage: "failed", message, error: message }).catch(() => null);
      emit({ type: "error", scanId: scan.id, error: message });
    } finally {
      close();
    }
  });
}
