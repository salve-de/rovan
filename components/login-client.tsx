"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowIcon, LockIcon } from "@/components/icons";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  expired: "ログインリンクの有効期限（15分）が切れています。もう一度メールアドレスを入力してください。",
  invalid: "無効なログインリンクです。もう一度メールアドレスを入力してください。",
  unavailable: "ログイン機能を一時的にご利用いただけません。時間を置いて再度お試しください。",
  google_not_configured: "Googleログインの設定が未完了です。メールアドレスでのログインをご利用ください。",
  google_unavailable: "Googleログインは現在ご利用いただけません。メールアドレスでのログインをご利用ください。",
  google_token_failed: "Googleログインの認証に失敗しました。もう一度お試しください。",
  email_not_provided: "Googleアカウントからメールアドレスを取得できませんでした。メールアドレスでのログインをご利用ください。",
  email_not_verified: "確認済みでないGoogleアカウントのため、ログインできませんでした。メールアドレスでのログインをご利用ください。",
  state_mismatch: "ログイン処理の確認に失敗しました。もう一度Googleログインをお試しください。",
  oauth_internal_error: "Googleログイン中にエラーが発生しました。もう一度お試しください。",
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
      setSentNotice(data.message || "登録済みの場合、ログイン用リンクをお送りしました。");
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
    <div className="billing-panel" style={{ maxWidth: "460px", margin: "40px auto" }}>
      <div className="billing-icon"><LockIcon /></div>
      <span style={{ fontSize: "0.75rem", fontWeight: 800, background: "#0f172a", color: "#ffffff", padding: "3px 10px", borderRadius: "4px", display: "inline-block", marginBottom: "8px" }}>
        ログイン
      </span>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "8px 0 12px", color: "#0f172a" }}>
        Rovan アカウントへログイン
      </h2>
      <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 24px", lineHeight: 1.5 }}>
        ご自身のAI推薦ダッシュボード、週次見守り、契約・決済管理画面を開きます。
      </p>

      {sent ? (
        <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "20px", textAlign: "left", marginBottom: "20px" }}>
          <strong style={{ display: "block", color: "#0f172a", fontSize: "0.95rem", marginBottom: "8px" }}>
            {emailUnavailable ? "現在メールでのログインはご利用いただけません" : "✉️ ご案内を送信しました"}
          </strong>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.6 }}>
            {emailUnavailable
              ? sentNotice
              : <><strong>{sentEmail}</strong> について、{sentNotice}届いたメール内のリンクをクリックすると、パスワード不要で即座にログインできます（有効期限15分）。</>}
          </p>
          {devLink ? (
            <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed #cbd5e1" }}>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                [ローカル開発用クイックログイン]
              </span>
              <a href={devLink} className="button button-dark" style={{ display: "block", textAlign: "center", fontSize: "0.82rem", padding: "8px 12px" }}>
                ワンクリックでログインを完了する →
              </a>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => { setSent(false); setEmail(""); }}
            style={{ marginTop: "16px", background: "none", border: "none", color: "#64748b", fontSize: "0.75rem", textDecoration: "underline", cursor: "pointer", padding: 0 }}
          >
            別のメールアドレスでログインし直す
          </button>
        </div>
      ) : (
        <>
          {googleEnabled ? (
            <>
              {/* Googleでログイン */}
              <div style={{ marginBottom: "20px" }}>
                <a
                  href="/api/auth/google"
                  className="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "12px 16px",
                    background: "#ffffff",
                    color: "#1e293b",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Googleでログイン
                </a>
              </div>

              <div style={{ display: "flex", alignItems: "center", margin: "20px 0", color: "#94a3b8", fontSize: "0.78rem" }}>
                <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
                <span style={{ padding: "0 12px" }}>またはメールアドレス</span>
                <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
              </div>
            </>
          ) : null}

          {/* メールアドレスでログイン */}
          <form onSubmit={handleEmailLogin} style={{ textAlign: "left" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              ご登録のメールアドレス
              <input
                type="email"
                required
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="president@example.co.jp"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "0.9rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  marginTop: "4px",
                  boxSizing: "border-box",
                }}
              />
            </label>
            <button
              className="button button-dark"
              type="submit"
              disabled={busy || !email.trim()}
              style={{ width: "100%", marginTop: "12px" }}
            >
              {busy ? "送信中…" : <>ログイン用リンクを送信する <ArrowIcon /></>}
            </button>
            {message ? <p className="form-error" role="status" style={{ marginTop: "12px" }}>{message}</p> : null}
          </form>
        </>
      )}

      <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b" }}>
        <span>まだ診断がお済みでない方は</span>
        <Link href="/" style={{ color: "#0f172a", fontWeight: 700, marginLeft: "6px", textDecoration: "underline" }}>
          無料でAI推薦を診断する →
        </Link>
      </div>
    </div>
  );
}
