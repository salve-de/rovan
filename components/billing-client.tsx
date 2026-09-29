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
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "契約情報を読み込めませんでした。"); if (!stale) setWatch(data); })
      .catch((error) => { if (!stale) setMessage(error instanceof Error ? error.message : "契約情報を読み込めませんでした。"); });
    return () => { stale = true; controller.abort(); };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !token || !watch) return;
    submitting.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "手続きの画面を開けませんでした。");
      window.location.assign(data.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "手続きの画面を開けませんでした。"); }
    finally { submitting.current = false; setBusy(false); }
  }

  return <div className="billing-panel">
    <form onSubmit={submit}>
      <div className="billing-icon"><LockIcon /></div>
      {watch ? (
        <div className="billing-watch-summary">
          <strong>{watch.latest.discovery.brandName}</strong>
          <small>{watch.paid ? "契約中" : watch.status === "trial" ? "無料期間中" : "契約していません"}</small>
        </div>
      ) : token && !message ? (
        <p className="billing-watch-summary" role="status">読み込んでいます…</p>
      ) : (
        <div className="billing-login-required">
          <strong>ログインが必要です</strong>
          <div className="billing-login-required-action">
            <Link href="/login" className="button button-primary">ログインする <ArrowIcon /></Link>
          </div>
        </div>
      )}
      <input type="hidden" value={token} disabled={busy} onChange={(event) => { setWatch(null); setToken(event.target.value); }} />
      <button className={`button button-primary${token ? "" : " is-hidden"}`} type="submit" disabled={busy || !token || !watch}>
        {busy ? "開いています…" : watch ? <>お支払い・解約の手続きへ（Stripe） <ArrowIcon /></> : "読み込んでいます…"}
      </button>
      {message ? <p className="form-error" role="status">{message}</p> : null}

      <div className="billing-cancel-note">
        <span>解約すると</span>
        <ul>
          <li>公開ページの自動更新が止まり、掲載期限が来ると非公開になります。</li>
          <li>測定の記録は残ります（<Link href="/data-rights">データ管理</Link>から削除できます）。</li>
        </ul>
      </div>

    </form>
    <p className="billing-note">カード情報はRovanに保存されません（決済はStripe）。</p>
    {watch ? <Link className="document-link" href={`/watch?token=${encodeURIComponent(token)}`}>← 毎週の報告へ戻る</Link> : <Link className="document-link" href="/">← トップへ戻る</Link>}
  </div>;
}
