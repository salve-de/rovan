"use client";

import { useState } from "react";

/** Share the public entry point, never a private diagnosis or Watch token. */
export function ExecutiveReferralCard() {
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(`AIに「おすすめ」を聞かれた時、自社が候補に入るかを調べる無料診断です。自社サイトの改修は不要で、URLまたは社名から始められます。\n${window.location.origin}/`);
      setStatus("紹介文をコピーしました。送信先と内容をご確認ください。");
    } catch { setStatus("コピーできませんでした。ホームページのURLを共有してください。"); }
  }
  return <section className="watch-section shell" aria-label="無料診断を紹介する">
    <h2>身近な経営者にも、AI推薦の現状を。</h2>
    <p>無料診断を紹介できます。あなたの診断結果・管理用リンクは含みません。</p>
    <button type="button" className="button button-secondary" onClick={() => void copy()}>無料診断の紹介文をコピー</button>
    <p role="status">{status}</p>
    <small>紹介報酬・初月割引は現在適用されません。</small>
  </section>;
}
