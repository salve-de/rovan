import { generateChangePack } from "@/lib/change-pack";
import { crawlCompanySite } from "@/lib/crawler";
import { getWatch, updateWatch } from "@/lib/storage";
import { toPublicChangePack } from "@/lib/public-dto";
import { safeErrorMessage } from "@/lib/safe-error";

// Only our own crawler validation message is safe to show verbatim; anything
// else (AI provider error text, HTTP status codes, storage errors) is internal.
const SAFE_CHANGE_PACK_MESSAGES = [
  "ホームページを読み込めませんでした。URLが正しいか確かめてください。",
];

export const runtime = "nodejs";

function packIsFresh(watch: NonNullable<Awaited<ReturnType<typeof getWatch>>>) {
  // Older persisted packs predate the AI-readable draft. Regenerate them once
  // so existing paid Watches can receive the new public-information output.
  if (!watch.changePack?.aiReadable || watch.changePack.sourceMeasurementId !== watch.latest.scanId) return false;
  const generatedAt = new Date(watch.changePack.generatedAt).getTime();
  const latestEvidenceAt = Math.max(0, ...watch.evidence.map((item) => new Date(item.updatedAt).getTime()));
  return generatedAt >= latestEvidenceAt;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const token = body.token?.trim() || "";
    if (!token) return Response.json({ error: "管理用リンクから開いてください。" }, { status: 400 });

    const watch = await getWatch(token);
    if (!watch) return Response.json({ error: "見守りが見つかりません。" }, { status: 404 });
    if (!watch.paid || watch.status !== "active") return Response.json({ error: "改善案は有料の見守りで使えます。" }, { status: 403 });
    if (packIsFresh(watch)) return Response.json({ changePack: watch.changePack ? toPublicChangePack(watch.changePack) : null }, { headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });

    const crawl = await crawlCompanySite(watch.latest.targetUrl, 40);
    const changePack = await generateChangePack({ result: watch.latest, pages: crawl.pages, evidence: watch.evidence });
    if (!changePack) return Response.json({ error: "改善案をつくれませんでした。時間をおいてお試しください。" }, { status: 503 });

    const updated = await updateWatch(token, { changePack });
    if (!updated) return Response.json({ error: "改善案を保存できませんでした。もう一度お試しください。" }, { status: 500 });
    return Response.json({ changePack: updated.changePack ? toPublicChangePack(updated.changePack) : null }, { headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });
  } catch (error) {
    console.error("Change Pack generation failed:", error);
    return Response.json({ error: safeErrorMessage(error, "改善案をつくれませんでした。時間をおいてお試しください。", SAFE_CHANGE_PACK_MESSAGES) }, { status: 400 });
  }
}
