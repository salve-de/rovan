"use client";

import { useState } from "react";
import { profileManagementHref, type ProfileManagementCapability } from "@/lib/profile-management-link";

/** あとで公開を止めたり直したりするための管理用リンク。なくすと管理できないので、コピーして残してもらう */
export function ProfileManagementLink({ capability }: { capability: ProfileManagementCapability }) {
  const [message, setMessage] = useState("");
  const href = profileManagementHref(capability);
  return <div className="manage-link-box">
    <p className="manage-link-title">管理用リンク</p>
    <p>公開の停止や内容の変更に使います。人には送らないでください。</p>
    <div className="manage-link-actions">
      <button type="button" className="button button-secondary" onClick={async () => {
        const url = new URL(href, window.location.origin).href;
        try { await navigator.clipboard.writeText(url); setMessage("コピーしました。メモなどに保存してください。"); }
        catch { setMessage("コピーできませんでした。「管理画面を開く」から開いて、アドレスを保存してください。"); }
      }}>管理用リンクをコピー</button>
      <a className="document-link" href={href} referrerPolicy="no-referrer">管理画面を開く</a>
    </div>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
