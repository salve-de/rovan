import { NextResponse } from "next/server";
import { findWatchesByEmail } from "@/lib/storage";
import { createOneTimeLoginToken } from "@/lib/auth";
import { env } from "@/lib/env";

// Registration status must never be observable from this endpoint's
// response: an attacker who can tell "this email has an account" from "it
// doesn't" gets a free account-enumeration oracle. Every valid email format
// gets the same status/shape back, whether or not it is registered.
const GENERIC_SUCCESS_MESSAGE = "ご入力のメールアドレスが登録済みの場合、ログイン用リンクをお送りしました。";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "有効なメールアドレスを入力してください。" }, { status: 400 });
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
        message: "現在メールでのログインをご利用いただけません。お送りしている管理用URLからログインしてください。",
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
              subject: "【Rovan】ログイン用リンクをお届けします",
              text: `Rovanへのログインリクエストを受け付けました。\n\n以下のリンクをクリックしてログインしてください（有効期限15分）：\n${loginUrl}\n\n※このメールに心当たりがない場合は、安全のため破棄してください。`,
              html: `<p>Rovanへのログインリクエストを受け付けました。</p><p><a href="${loginUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Rovanにログインする</a></p><p style="color:#64748b;font-size:0.85rem;">リンクの有効期限は15分です。<br />※このメールに心当たりがない場合は破棄してください。</p>`,
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
    return NextResponse.json({ error: "ログインリンクの送信に失敗しました。時間を置いて再度お試しください。" }, { status: 500 });
  }
}
