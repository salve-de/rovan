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
    if (!destination) { setError("このリンクでは開けません。診断のあとに表示された、またはメールで届いたリンクを入れてください。"); return; }
    router.push(destination);
  }
  return <form onSubmit={open} className="management-entry">
    <label htmlFor="management-url">管理用リンク</label>
    <input id="management-url" required type="text" autoComplete="off" spellCheck={false} value={value} onChange={event => setValue(event.target.value)} placeholder="https://rovan.jp/watch?token=…" className="management-entry-input" />
    <button className="button button-primary" type="submit">開く</button>
    {error ? <p role="alert" className="form-error">{error}</p> : null}
    <div className="management-entry-alt">
      <Link href="/login" className="button button-secondary management-entry-login-btn">メールアドレスでログイン</Link>
    </div>
  </form>;
}
