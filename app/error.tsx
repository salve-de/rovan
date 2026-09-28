"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Rovan route error", error); }, [error]);
  return <main className="empty-page"><div className="shell empty-content">
    <p className="eyebrow">Rovan ERROR</p>
    <h1>処理を完了できませんでした。</h1>
    <p>再試行しても解決しない場合は、時間を空けてから再度お試しください。</p>
    {error.digest ? <small>Reference: {error.digest}</small> : null}
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
      <button className="button button-dark" type="button" onClick={reset}>再試行する</button>
      <Link className="button button-primary" href="/">トップへ戻る</Link>
      <Link className="button button-secondary" href="/support">サポートに連絡する</Link>
    </div>
  </div></main>;
}
