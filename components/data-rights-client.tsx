"use client";

import { DATA_DELETION_CONFIRMATION } from "@/lib/brand";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { watchTokenFromInput } from "@/lib/management-link";
import { ArrowIcon, LockIcon, WarningIcon } from "@/components/icons";

export function DataRightsClient() {
  const params = useSearchParams();
  const initialToken = params.get("token") || "";
  return <DataRightsForm key={initialToken} initialToken={initialToken} />;
}

function DataRightsForm({ initialToken }: { initialToken: string }) {
  const [tokenInput, setTokenInput] = useState(initialToken);
  const token = watchTokenFromInput(tokenInput);
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"" | "export" | "delete">("");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const lifetime = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

  function setToken(value: string) {
    if (watchTokenFromInput(value) !== token) {
      setEmail(""); setConfirmation(""); setMessage("");
    }
    setTokenInput(value);
  }

  async function exportData(event: FormEvent) {
    event.preventDefault();
    const signal = lifetime.current?.signal;
    if (submitting.current || !signal || signal.aborted) return;
    submitting.current = true; setBusy("export"); setMessage("");
    try {
      const response = await fetch("/api/privacy/export", { signal, method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, email }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "ダウンロードできませんでした。"); }
      const blob = await response.blob();
      if (signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `rovan-export-${Date.now()}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000); setMessage("ダウンロードしました。");
    } catch (error) { if (!signal.aborted) setMessage(error instanceof Error ? error.message : "ダウンロードできませんでした。"); }
    finally { if (!signal.aborted) { submitting.current = false; setBusy(""); } }
  }

  async function deleteData(event: FormEvent) {
    event.preventDefault();
    const signal = lifetime.current?.signal;
    if (submitting.current || !signal || signal.aborted) return;
    submitting.current = true; setBusy("delete"); setMessage("");
    try {
      const response = await fetch("/api/privacy/delete", { signal, method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, email, confirmation }) });
      const data = await response.json();
      if (signal.aborted) return;
      if (!response.ok || data.deleted !== true) throw new Error(data.error || "削除できませんでした。");
      setMessage("削除しました。"); setTokenInput(""); setEmail(""); setConfirmation("");
    } catch (error) { if (!signal.aborted) setMessage(error instanceof Error ? error.message : "削除できませんでした。"); }
    finally { if (!signal.aborted) { submitting.current = false; setBusy(""); } }
  }

  return <div className="data-rights-grid">
    {token ? <p><Link className="document-link" href={`/watch?token=${encodeURIComponent(token)}`}>← 毎週の報告へ戻る</Link></p> : null}
    <form onSubmit={exportData}><div className="data-rights-icon"><LockIcon /></div><h2>データをダウンロード</h2><label>管理用リンク<input required autoComplete="off" disabled={!!busy} value={tokenInput} onChange={(event) => setToken(event.target.value)} /></label><label>登録したメールアドレス（登録した方のみ）<input disabled={!!busy} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="button button-primary" disabled={!!busy}>{busy === "export" ? "作成中…" : <>ダウンロード（JSON） <ArrowIcon /></>}</button></form>
    <form onSubmit={deleteData}><div className="data-rights-icon warning"><WarningIcon /></div><h2>データを削除</h2><p>毎週の報告と測定の記録を削除します。元に戻せません。公開ページは削除されません（公開ページの管理画面で停止できます）。</p><label>管理用リンク<input required autoComplete="off" disabled={!!busy} value={tokenInput} onChange={(event) => setToken(event.target.value)} /></label><label>登録したメールアドレス（登録した方のみ）<input disabled={!!busy} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>確認のため「{DATA_DELETION_CONFIRMATION}」と入力<input required disabled={!!busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={DATA_DELETION_CONFIRMATION} /></label><button className="button button-danger" disabled={!!busy}>{busy === "delete" ? "削除中…" : "削除する"}</button></form>
    {message ? <p className="data-rights-message" role="status">{message}</p> : null}
  </div>;
}
