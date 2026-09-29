"use client";

import { useState } from "react";
import { profileManagementHref, type ProfileManagementCapability } from "@/lib/profile-management-link";

export function ProfileManagementLink({ capability }: { capability: ProfileManagementCapability }) {
  const [message, setMessage] = useState("");
  const href = profileManagementHref(capability);
  return <div className="document-note">
    <a className="document-link" href={href} referrerPolicy="no-referrer">公開ページの管理画面を開く</a>
    <p>この管理リンクを保存すると、タブを閉じた後や別のブラウザーでも公開停止・更新設定ができます。管理権限を含むため、公開用URLと分けて保管してください。</p>
    <button type="button" className="button button-secondary" onClick={async () => {
      const url = new URL(href, window.location.origin).href;
      try { await navigator.clipboard.writeText(url); setMessage("管理リンクをコピーしました。安全な場所に保存してください。"); }
      catch { setMessage("コピーできませんでした。管理画面を開き、アドレスを保存してください。"); }
    }}>管理リンクをコピーして保存</button>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
