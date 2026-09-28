"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { managementDestination } from "@/lib/management-link";

export function ManagementEntry() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  function open(event: FormEvent) {
    event.preventDefault();
    const destination = managementDestination(value, window.location.origin);
    if (!destination) { setError("このRovanで発行された診断結果・週次見守り・公開ページ管理のURLを貼り付けてください。一般公開用URLでは管理画面を開けません。"); return; }
    router.push(destination);
  }
  return <form onSubmit={open} className="management-entry">
    <label htmlFor="management-url">診断後に表示・メールで届いた「管理用リンク」</label>
    <input id="management-url" required type="text" autoComplete="off" spellCheck={false} value={value} onChange={event => setValue(event.target.value)} placeholder="https://rovan.jp/watch?token=... など" style={{ width: "100%", padding: "12px", margin: "12px 0" }} />
    <button className="button button-primary" type="submit">自分の管理画面を開く</button>
    {error ? <p role="alert" className="form-error">{error}</p> : null}
    <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "0.82rem" }}>
      <p style={{ margin: "0 0 8px", color: "#64748b" }}>またはアカウントをお持ちの方：</p>
      <Link href="/login" className="button button-secondary" style={{ width: "100%", justifyContent: "center" }}>
        Google・メールアドレスでログインする →
      </Link>
    </div>
    <p style={{ marginTop: "16px", fontSize: "0.75rem", color: "#94a3b8" }}>
      ブックマーク、または受信したRovanの通知メールからも開けます。管理URLには操作権限が含まれます。他の人には共有しないでください。
    </p>
  </form>;
}
