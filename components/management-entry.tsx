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
    <input id="management-url" required type="text" autoComplete="off" spellCheck={false} value={value} onChange={event => setValue(event.target.value)} placeholder="https://rovan.jp/watch?token=... など" className="management-entry-input" />
    <button className="button button-primary" type="submit">自分の管理画面を開く</button>
    {error ? <p role="alert" className="form-error">{error}</p> : null}
    <div className="management-entry-alt">
      <p>またはアカウントをお持ちの方：</p>
      <Link href="/login" className="button button-secondary management-entry-login-btn">
        Google・メールアドレスでログインする →
      </Link>
    </div>
    <p className="management-entry-note">
      ブックマーク、または受信したRovanの通知メールからも開けます。管理URLには操作権限が含まれます。他の人には共有しないでください。
    </p>
  </form>;
}
