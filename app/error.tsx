"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Rovan route error", error); }, [error]);
  return <main className="empty-page"><div className="shell empty-content">
    <p className="eyebrow">エラー</p>
    <h1>処理を完了できませんでした。</h1>
    <p>再試行しても解決しない場合は、時間を空けてから再度お試しください。</p>
    {error.digest ? <small>問い合わせ番号: {error.digest}</small> : null}
    <div className="error-page-actions">
      <button className="button button-dark" type="button" onClick={reset}>再試行する</button>
      <Link className="button button-primary" href="/">トップへ戻る</Link>
    </div>
  </div></main>;
}
