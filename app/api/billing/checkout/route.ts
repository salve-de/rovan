import { env } from "@/lib/env";
import { sellerReady } from "@/lib/legal";
import { getWatch } from "@/lib/storage";
import { stripe, terminalSubscription, validToken } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!validToken(body?.token)) return Response.json({ error: "管理用リンクから開いてください。" }, { status: 400 });
    const watch = await getWatch(body.token);
    if (!watch) return Response.json({ error: "見守りが見つかりません。" }, { status: 404 });
    if (watch.paid) return Response.json({ error: "すでに契約中です。" }, { status: 409 });
    if (!sellerReady()) return Response.json({ error: "いまは有料の申し込みを受け付けていません。" }, { status: 503 });
    if (!env.stripeSecretKey || !env.stripePriceId) return Response.json({ error: "いまは有料の申し込みを受け付けていません。" }, { status: 503 });
    if (watch.stripeSubscriptionId) {
      const subscription = await stripe(`/subscriptions/${encodeURIComponent(watch.stripeSubscriptionId)}`);
      if (!terminalSubscription(subscription.status)) return Response.json({ error: "すでに契約があります。「ご契約・お支払い」から確認してください。" }, { status: 409 });
    }

    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("locale", "ja");
    form.set("line_items[0][price]", env.stripePriceId);
    form.set("line_items[0][quantity]", "1");
    if (watch.stripeCustomerId) form.set("customer", watch.stripeCustomerId);
    else form.set("customer_email", watch.email);
    form.set("billing_address_collection", "required");
    form.set("success_url", `${env.siteUrl}/watch?token=${encodeURIComponent(watch.token)}&checkout=success`);
    form.set("cancel_url", `${env.siteUrl}/watch?token=${encodeURIComponent(watch.token)}&checkout=cancelled`);
    form.set("client_reference_id", watch.id);
    form.set("metadata[watch_token]", watch.token);
    form.set("subscription_data[metadata][watch_token]", watch.token);

    const data = await stripe("/checkout/sessions", form);
    if (!data.url) throw new Error("Checkout unavailable");
    return Response.json({ url: data.url }, { headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  } catch {
    return Response.json({ error: "お支払いの画面を開けませんでした。時間をおいてお試しください。" }, { status: 502 });
  }
}
