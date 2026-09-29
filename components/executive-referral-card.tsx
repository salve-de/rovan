"use client";

import { useState } from "react";

/** Share the public entry point, never a private diagnosis or Watch token. */
export function ExecutiveReferralCard() {
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(`ChatGPTなどのAIに「おすすめは？」と聞いたとき、自分の会社の名前が出るかを無料で調べられます。社名を入れるだけです。\n${window.location.origin}/`);
      setStatus("コピーしました。");
    } catch { setStatus("コピーできませんでした。"); }
  }
  return <section className="watch-section shell" aria-label="知り合いの経営者に紹介する">
    <h2>知り合いの経営者に紹介する</h2>
    <p>あなたの結果は含まれません。</p>
    <button type="button" className="button button-secondary" onClick={() => void copy()}>紹介文をコピー</button>
    <p role="status">{status}</p>
  </section>;
}
