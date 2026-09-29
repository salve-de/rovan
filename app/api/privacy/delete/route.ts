import { isDataDeletionConfirmation } from "@/lib/brand-compatibility";
import { deleteWatchData } from "@/lib/privacy-data";
import { getWatch } from "@/lib/storage";
import { stripe, stripeId, terminalSubscription, validToken } from "../../billing/_shared";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!validToken(body?.token) || typeof body?.email !== "string" || !isDataDeletionConfirmation(body?.confirmation)) return Response.json({ error: "管理用リンクと、確認のための「DELETE ROVAN DATA」を入れてください（メールを登録した方はメールアドレスも）。" }, { status: 400 });
    const watch = await getWatch(body.token);
    if (!watch) {
      const receipt = await deleteWatchData(body.token, body.email);
      return Response.json(receipt, { headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
    }
    if (!watch || watch.email !== body.email.trim().toLowerCase()) return Response.json({ error: "管理用リンクと登録したメールアドレスが一致しません。" }, { status: 403 });
    if (watch.paid && !watch.stripeSubscriptionId) return Response.json({ error: "契約中のため削除できませんでした。先に解約するか、お問い合わせください。" }, { status: 409 });
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
    return Response.json({ error: "削除を完了できませんでした。時間をおいてもう一度お試しください。直らない場合はお問い合わせください。" }, { status: 503 });
  }
}
