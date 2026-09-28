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
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "書き出せませんでした。"); }
      const blob = await response.blob();
      if (signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `rovan-export-${Date.now()}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000); setMessage("データを書き出しました。");
    } catch (error) { if (!signal.aborted) setMessage(error instanceof Error ? error.message : "書き出せませんでした。"); }
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
      setMessage("週次見守りとその測定履歴を削除しました。他の週次見守りや公開プロフィールが参照する診断は保持されます。公開プロフィールの掲載停止は、その管理画面をご利用ください。"); setTokenInput(""); setEmail(""); setConfirmation("");
    } catch (error) { if (!signal.aborted) setMessage(error instanceof Error ? error.message : "削除できませんでした。"); }
    finally { if (!signal.aborted) { submitting.current = false; setBusy(""); } }
  }

  return <div className="data-rights-grid">
    <p><Link href={token ? `/watch?token=${encodeURIComponent(token)}` : "/manage"}>{token ? "週次見守りへ戻る" : "管理画面を開く"}</Link></p>
    <p>週次見守りの管理URLをそのまま貼り付けられます。メールを登録していない場合は、登録メール欄を空にしてください。登録済みの場合は一致するメールが必要です。管理URLを他の人に共有しないでください。</p>
    <p className="document-note">対象は、この週次見守りとその測定履歴です。公開プロフィールは管理権限が別のため、書き出し・削除に含まれません。公開プロフィールの掲載停止は公開時の管理画面をご利用ください。他の週次見守りや公開プロフィールから参照される診断、法令・運用上必要な削除記録は保持されます。</p>
    <form onSubmit={exportData}><div className="data-rights-icon"><LockIcon /></div><h2>データを書き出す</h2><p>週次見守り、測定履歴、確認情報をJSONで取得します。</p><label>見守りの管理URL（または管理キー）<input required autoComplete="off" disabled={!!busy} value={tokenInput} onChange={(event) => setToken(event.target.value)} /></label><label>登録メール（未登録なら空欄）<input disabled={!!busy} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="button button-dark" disabled={!!busy}>{busy === "export" ? "作成中…" : <>JSONを取得 <ArrowIcon /></>}</button></form>
    <form onSubmit={deleteData}><div className="data-rights-icon warning"><WarningIcon /></div><h2>完全に削除する</h2><p>週次見守りを削除します。共有されていない元の診断も削除します。元に戻せません。</p><label>見守りの管理URL（または管理キー）<input required autoComplete="off" disabled={!!busy} value={tokenInput} onChange={(event) => setToken(event.target.value)} /></label><label>登録メール（未登録なら空欄）<input disabled={!!busy} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>確認文字列<input required disabled={!!busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={DATA_DELETION_CONFIRMATION} /></label><button className="button button-danger" disabled={!!busy}>{busy === "delete" ? "削除中…" : "データを完全に削除する"}</button></form>
    {message ? <p className="data-rights-message" role="status">{message}</p> : null}
  </div>;
}
