import { addEvidence, getWatch, updateWatch } from "@/lib/storage";
import { toPublicWatch } from "@/lib/public-dto";
import { normalizePublicUrl } from "@/lib/url-security";
import { safeErrorMessage } from "@/lib/safe-error";

export const runtime = "nodejs";

function sourceUrl(value: string) {
  if (!value) return undefined;
  return normalizePublicUrl(value);
}

// These are the only messages our own validation code (normalizePublicUrl)
// throws; anything else is an internal/storage error and must not leak.
const SAFE_EVIDENCE_MESSAGES = [
  "会社サイトのURLを入力してください。",
  "httpまたはhttpsの公開URLだけ利用できます。",
  "認証情報を含むURLは利用できません。",
  "標準ポート以外のURLは利用できません。",
  "公開ドメインを入力してください。",
  "内部IPは利用できません。",
];

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; gapId?: string; value?: string; sourceUrl?: string };
    const token = body.token?.trim() || "";
    const gapId = body.gapId?.trim().slice(0, 160) || "";
    const value = body.value?.trim().slice(0, 5_000) || "";
    if (!token || !gapId || !value) return Response.json({ error: "入力が足りません。" }, { status: 400 });
    const current = await getWatch(token);
    if (!current) return Response.json({ error: "見守りが見つかりません。" }, { status: 404 });
    if (!["trial", "active"].includes(current.status)) return Response.json({ error: "見守りが止まっているため、追加できません。" }, { status: 409 });
    if (!current.latest.evidenceGaps.some((gap) => gap.id === gapId)) return Response.json({ error: "今回の結果にない項目です。" }, { status: 400 });
    const watch = await addEvidence(token, { gapId, value, sourceUrl: sourceUrl(body.sourceUrl?.trim() || "") });
    if (!watch) return Response.json({ error: "保存できませんでした。もう一度お試しください。" }, { status: 500 });
    const updated = watch.changePack ? (await updateWatch(token, { changePack: null }) || watch) : watch;
    return Response.json(toPublicWatch(updated), { headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });
  } catch (error) {
    console.error("Evidence save failed:", error);
    return Response.json({ error: safeErrorMessage(error, "Evidenceを保存できませんでした。", SAFE_EVIDENCE_MESSAGES) }, { status: 400 });
  }
}
