import { isDataDeletionConfirmation } from "@/lib/brand-compatibility";
import { deleteWatchData } from "@/lib/privacy-data";
import { getWatch } from "@/lib/storage";
import { stripe, stripeId, terminalSubscription, validToken } from "../../billing/_shared";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!validToken(body?.token) || typeof body?.email !== "string" || !isDataDeletionConfirmation(body?.confirmation)) return Response.json({ error: "管理用リンク、メールを登録した場合はそのアドレス、確認文字列 DELETE ROVAN DATA が必要です。" }, { status: 400 });
    const watch = await getWatch(body.token);
    if (!watch) {
      const receipt = await deleteWatchData(body.token, body.email);
      return Response.json(receipt, { headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
    }
    if (!watch || watch.email !== body.email.trim().toLowerCase()) return Response.json({ error: "Watch tokenと登録メールが一致しません。" }, { status: 403 });
    if (watch.paid && !watch.stripeSubscriptionId) return Response.json({ error: "契約の停止を確認できないため削除を中断しました。サポートへお問い合わせください。" }, { status: 409 });
    // The privacy service cancels paid subscriptions. Also stop recoverable
    // unpaid/paused/incomplete subscriptions before discarding their identifiers.
    let stopped = false;
    if (watch.stripeSubscriptionId && !watch.paid) {
      const path = `/subscriptions/${encodeURIComponent(watch.stripeSubscriptionId)}`;
      const subscription = await stripe(path);
      if (subscription.id !== watch.stripeSubscriptionId || subscription.metadata?.watch_token !== watch.token ||
          (watch.stripeCustomerId && stripeId(subscription.customer) !== watch.stripeCustomerId)) throw new Error("Subscription binding mismatch");
      if (!terminalSubscription(subscription.status)) {
        const cancelled = await stripe(path, undefined, "DELETE");
        if (cancelled.status !== "canceled") throw new Error("Cancellation not confirmed");
        stopped = true;
      }
    }
    const result = await deleteWatchData(body.token, body.email);
    return Response.json({ ...result, subscriptionCancelled: stopped || result.subscriptionCancelled }, { headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  } catch {
    return Response.json({ error: "削除処理を完了できませんでした。契約停止や一部の削除が済んでいる可能性があります。再試行しても失敗する場合はサポートへお問い合わせください。" }, { status: 503 });
  }
}
