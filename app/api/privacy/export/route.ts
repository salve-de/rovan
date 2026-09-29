import { exportWatchData } from "@/lib/privacy-data";
import { validToken } from "../../billing/_shared";
import { getWatch } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!validToken(body?.token) || typeof body?.email !== "string") return Response.json({ error: "管理用リンクを入れてください（メールを登録した方はメールアドレスも）。" }, { status: 400 });
    const watch = await getWatch(body.token);
    if (!watch || watch.email !== body.email.trim().toLowerCase()) return Response.json({ error: "管理用リンクと登録したメールアドレスが一致しません。" }, { status: 403 });
    const data = await exportWatchData(body.token, body.email);
    return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="rovan-export-${Date.now()}.json"`, "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });
  } catch {
    return Response.json({ error: "ダウンロードできませんでした。時間をおいてお試しください。" }, { status: 503 });
  }
}
