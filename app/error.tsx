"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Rovan route error", error); }, [error]);
  return <main className="empty-page"><SiteHeader compact /><div className="shell empty-content">
    <p className="eyebrow">エラー</p>
    <h1>処理を完了できませんでした。</h1>
    <p>通信が混み合っているか、一時的な不具合の可能性があります。「もう一度試す」で直らない場合は、少し時間をおいてからお試しください。</p>
    {error.digest ? <small>問い合わせ番号: {error.digest}</small> : null}
    <div className="error-page-actions">
      <button className="button button-primary" type="button" onClick={reset}>もう一度試す</button>
      <Link className="button button-secondary" href="/">トップへ戻る</Link>
    </div>
  </div></main>;
}
