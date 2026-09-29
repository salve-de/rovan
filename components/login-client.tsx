"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowIcon } from "@/components/icons";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  expired: "リンクの期限（15分）が切れました。もう一度メールアドレスを入れてください。",
  invalid: "このリンクは使えません。もう一度メールアドレスを入れてください。",
  unavailable: "いまはログインできません。少し時間をおいてお試しください。",
  google_not_configured: "Googleでのログインは使えません。メールアドレスでログインしてください。",
  google_unavailable: "Googleでのログインは使えません。メールアドレスでログインしてください。",
  google_token_failed: "Googleでのログインに失敗しました。もう一度お試しください。",
  email_not_provided: "Googleからメールアドレスを受け取れませんでした。メールアドレスでログインしてください。",
  email_not_verified: "このGoogleアカウントではログインできません。メールアドレスでログインしてください。",
  state_mismatch: "ログインに失敗しました。もう一度お試しください。",
  oauth_internal_error: "ログインに失敗しました。もう一度お試しください。",
  cancelled: "ログインがキャンセルされました。",
};

export function LoginClient({ googleEnabled }: { googleEnabled: boolean }) {
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [sentNotice, setSentNotice] = useState("");
  const [emailUnavailable, setEmailUnavailable] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [message, setMessage] = useState(() => (initialError ? LOGIN_ERROR_MESSAGES[initialError] || "ログインでエラーが発生しました。もう一度お試しください。" : ""));

  async function handleEmailLogin(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setMessage("");
    setDevLink(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "ログインリンクの送信に失敗しました。");
      }
      setSent(true);
      setSentEmail(email.trim());
      setSentNotice(data.message || "登録済みのメールアドレスなら、ログイン用のリンクが届きます。");
      setEmailUnavailable(Boolean(data.emailUnavailable));
      if (data.devLoginUrl) {
        setDevLink(data.devLoginUrl);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ログインリンクの送信に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="billing-panel login-panel">
      {sent ? (
        <div className="login-sent-box">
          <strong>{emailUnavailable ? "いまはメールでログインできません" : "メールを送りました"}</strong>
          <p>
            {emailUnavailable
              ? sentNotice
              : <><strong>{sentEmail}</strong> が登録済みなら、ログイン用のリンクが届きます。15分以内に押してください。</>}
          </p>
          {devLink ? (
            <div className="login-dev-link">
              <span>ローカル開発用クイックログイン</span>
              <a href={devLink} className="button button-primary">ワンクリックでログインを完了する <ArrowIcon /></a>
            </div>
          ) : null}
          <button type="button" className="login-retry-btn" onClick={() => { setSent(false); setEmail(""); }}>
            別のメールアドレスにする
          </button>
        </div>
      ) : (
        <>
          {googleEnabled ? (
            <>
              <div className="login-google-row">
                <a href="/api/auth/google" className="button login-google-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Googleでログイン
                </a>
              </div>
              <div className="login-divider">
                <span />
                <em>またはメールアドレス</em>
                <span />
              </div>
            </>
          ) : null}

          <form onSubmit={handleEmailLogin} className="login-email-form">
            <label>
              メールアドレス
              <input
                type="email"
                required
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="president@example.co.jp"
              />
            </label>
            <button className="button button-primary login-submit-btn" type="submit" disabled={busy || !email.trim()}>
              {busy ? "送信中…" : <>ログイン用のリンクを受け取る <ArrowIcon /></>}
            </button>
            {message ? <p className="form-error login-form-error" role="status">{message}</p> : null}
          </form>
        </>
      )}

      <div className="login-panel-footer">
        <span>はじめての方は</span>
        <Link href="/">無料で診断する <ArrowIcon /></Link>
      </div>
    </div>
  );
}
