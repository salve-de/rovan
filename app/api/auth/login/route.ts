import { NextResponse } from "next/server";
import { findWatchesByEmail } from "@/lib/storage";
import { createOneTimeLoginToken } from "@/lib/auth";
import { env } from "@/lib/env";

// Registration status must never be observable from this endpoint's
// response: an attacker who can tell "this email has an account" from "it
// doesn't" gets a free account-enumeration oracle. Every valid email format
// gets the same status/shape back, whether or not it is registered.
const GENERIC_SUCCESS_MESSAGE = "登録済みのメールアドレスなら、ログイン用のリンクが届きます。";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "メールアドレスを正しく入れてください。" }, { status: 400 });
    }

    const isDev = process.env.NODE_ENV === "development";
    const emailDeliveryConfigured = Boolean(env.resendApiKey && env.watchFromEmail);

    // System-wide state (not tied to this particular email), so it is safe
    // to answer honestly for every request without leaking registration
    // status: nobody can get a link by email right now, regardless of input.
    if (!emailDeliveryConfigured && !isDev) {
      return NextResponse.json({
        ok: true,
        emailUnavailable: true,
        message: "いまはメールでログインできません。管理用リンクから開いてください。",
      });
    }

    const watches = await findWatchesByEmail(email).catch(() => []);
    const latestWatch = watches[0];

    let devLoginUrl: string | undefined;
    if (latestWatch) {
      const loginToken = createOneTimeLoginToken(email);
      const origin = env.siteUrl || request.headers.get("origin") || "http://localhost:3000";
      const loginUrl = `${origin}/api/auth/verify?token=${encodeURIComponent(loginToken)}`;

      if (emailDeliveryConfigured) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              authorization: `Bearer ${env.resendApiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              from: env.watchFromEmail,
              to: email,
              subject: "【Rovan】ログイン用のリンク",
              text: `下のリンクを押すと、Rovanにログインできます（15分以内）。\n${loginUrl}\n\n心当たりがない場合は、このメールを削除してください。`,
              html: `<p>下のボタンを押すと、Rovanにログインできます（15分以内）。</p><p><a href="${loginUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">ログインする</a></p><p style="color:#64748b;font-size:0.85rem;">心当たりがない場合は、このメールを削除してください。</p>`,
            }),
          });
        } catch (err) {
          console.error("Failed to send login email via Resend:", err);
        }
      }

      // Local-dev convenience only: never exposed outside NODE_ENV=development.
      if (isDev) devLoginUrl = loginUrl;
    }

    return NextResponse.json({
      ok: true,
      message: GENERIC_SUCCESS_MESSAGE,
      devLoginUrl,
    });
  } catch (error) {
    console.error("Login link request failed:", error);
    return NextResponse.json({ error: "メールを送れませんでした。時間をおいてお試しください。" }, { status: 500 });
  }
}
