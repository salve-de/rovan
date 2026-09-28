"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowIcon, LockIcon } from "@/components/icons";
import type { WatchRecord } from "@/lib/types";

export function BillingClient() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [watch, setWatch] = useState<WatchRecord | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (token) return;
    let stale = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!stale && data?.authenticated && data?.user?.watchToken) {
          setToken(data.user.watchToken);
        }
      })
      .catch(() => {});
    return () => { stale = true; };
  }, [token]);

  useEffect(() => {
    let stale = false;
    const controller = new AbortController();
    setWatch(null);
    setMessage("");
    if (!token) return;
    fetch(`/api/watch?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "週次見守りの情報を取得できませんでした。"); if (!stale) setWatch(data); })
      .catch((error) => { if (!stale) setMessage(error instanceof Error ? error.message : "週次見守りの情報を取得できませんでした。"); });
    return () => { stale = true; controller.abort(); };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !token || !watch) return;
    submitting.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "契約管理を開始できませんでした。");
      window.location.assign(data.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "契約管理を開始できませんでした。"); }
    finally { submitting.current = false; setBusy(false); }
  }

  return <div className="billing-panel">
    <form onSubmit={submit}>
      <div className="billing-icon"><LockIcon /></div>
      {watch ? (
        <div className="billing-watch-summary">
          <span>ログイン中</span>
          <strong>{watch.latest.discovery.brandName}</strong>
          <small>{watch.paid ? "有料見守り契約中" : watch.status === "trial" ? "無料トライアル中" : "契約状況をご確認ください"}</small>
        </div>
      ) : (
        <div className="billing-login-required">
          <strong>ログインが必要です</strong>
          <p>本画面はご契約者様専用の管理画面です。Googleアカウントまたはメールアドレスでログインしてください。</p>
          <div className="billing-login-required-action">
            <Link href="/login" className="button button-dark">ログイン画面を開く <ArrowIcon /></Link>
          </div>
        </div>
      )}
      <input type="hidden" value={token} disabled={busy} onChange={(event) => { setWatch(null); setToken(event.target.value); }} />
      <button className={`button button-dark${token ? "" : " is-hidden"}`} type="submit" disabled={busy || !token || !watch}>
        {busy ? "準備中…" : watch ? <>契約・決済管理画面を開く <ArrowIcon /></> : "契約情報を確認しています…"}
      </button>
      {message ? <p className="form-error" role="status">{message}</p> : null}

      <div className="billing-cancel-note">
        <span>ご解約時に何が起きるか</span>
        <ul>
          <li><strong>公開ページの自動更新：</strong>解約すると、AI推薦データ（公開ページ）の毎週の自動更新と掲載期限の延長が止まります。すでに設定されている掲載期限までは表示され、期限が来ると自動的に非公開になります。</li>
          <li><strong>保存データ：</strong>それまでの測定履歴・設定はRovan上に保存されたままです。削除をご希望の場合は、<Link href="/data-rights">データ管理画面</Link>からいつでも申請できます。</li>
        </ul>
      </div>

    </form>
    <p className="billing-note">クレジットカード情報はStripeが管理し、Rovanでは保持しません。</p>
    {watch ? <Link className="document-link" href={`/watch?token=${encodeURIComponent(token)}`}>← 見守りダッシュボードへ戻る</Link> : <Link className="document-link" href="/">← トップページへ戻る</Link>}
  </div>;
}
