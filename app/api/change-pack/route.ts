import { generateChangePack } from "@/lib/change-pack";
import { crawlCompanySite } from "@/lib/crawler";
import { getWatch, updateWatch } from "@/lib/storage";
import { toPublicChangePack } from "@/lib/public-dto";
import { safeErrorMessage } from "@/lib/safe-error";

// Only our own crawler validation message is safe to show verbatim; anything
// else (AI provider error text, HTTP status codes, storage errors) is internal.
const SAFE_CHANGE_PACK_MESSAGES = [
  "公開ページを取得できませんでした。robots.txt、URL、サイト構成を確認してください。",
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
    if (!token) return Response.json({ error: "Watch tokenがありません。" }, { status: 400 });

    const watch = await getWatch(token);
    if (!watch) return Response.json({ error: "Watchが見つかりません。" }, { status: 404 });
    if (!watch.paid || watch.status !== "active") return Response.json({ error: "Change Packは有料Watchで利用できます。" }, { status: 403 });
    if (packIsFresh(watch)) return Response.json({ changePack: watch.changePack ? toPublicChangePack(watch.changePack) : null }, { headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });

    const crawl = await crawlCompanySite(watch.latest.targetUrl, 40);
    const changePack = await generateChangePack({ result: watch.latest, pages: crawl.pages, evidence: watch.evidence });
    if (!changePack) return Response.json({ error: "Change Packを生成できませんでした。必要なProvider設定またはActionを確認してください。" }, { status: 503 });

    const updated = await updateWatch(token, { changePack });
    if (!updated) return Response.json({ error: "Change Packを保存できませんでした。" }, { status: 500 });
    return Response.json({ changePack: updated.changePack ? toPublicChangePack(updated.changePack) : null }, { headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });
  } catch (error) {
    console.error("Change Pack generation failed:", error);
    return Response.json({ error: safeErrorMessage(error, "Change Packを生成できませんでした。", SAFE_CHANGE_PACK_MESSAGES) }, { status: 400 });
  }
}
