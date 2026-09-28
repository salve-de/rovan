"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "./site-header";
import { profileManagementHref } from "@/lib/profile-management-link";
import type { PublicProfile } from "@/lib/types";
import type { ProfileManagementCapability } from "@/lib/profile-management-link";
import { ProfileManagementLink } from "./profile-management-link";

type Managed = { profile: PublicProfile; direct: boolean; resultUrl?: string | null; automation: { enabled: boolean; maintenanceEnabled: boolean; canRollback: boolean } };

export function ProfileManagementClient() {
  const query = useSearchParams().toString();
  return <ManagementSession key={query} query={query} />;
}

function ManagementSession({ query }: { query: string }) {
  const [capability] = useState<ProfileManagementCapability>(() => {
    const params = new URLSearchParams(query);
    return { profileId: params.get("profileId") || "", token: params.get("token") || "", watchToken: params.get("watchToken") || "" };
  });
  const [profiles, setProfiles] = useState<Managed[]>([]);
  const [watchLink, setWatchLink] = useState("");
  const [message, setMessage] = useState("管理権限を確認しています。");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function request(body: Record<string, unknown>, signal?: AbortSignal) {
    const response = await fetch("/api/ai-profile", { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", referrerPolicy: "no-referrer", body: JSON.stringify(body), signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "管理状態を取得できませんでした。");
    return payload;
  }

  useEffect(() => {
    const controller = new AbortController();
    if (!capability.token && !capability.watchToken) { setMessage("保存した公開ページまたはWatchの管理リンクから開いてください。"); return; }
    void request({ action: "manage", ...capability }, controller.signal).then((data) => { setProfiles(data.profiles); setMessage(""); })
      .catch((error) => { if (!controller.signal.aborted) setMessage(error.message); });
    return () => controller.abort();
  }, [capability]);

  async function operate(profile: PublicProfile, action: string) {
    setBusy(true); setMessage("");
    try {
      let watchToken = capability.watchToken || "";
      if (watchLink.trim()) {
        const url = new URL(watchLink.trim(), window.location.origin);
        if (url.origin !== window.location.origin || !["/watch", "/profile/manage"].includes(url.pathname)) throw new Error("このRovanサイトの週次見守り管理リンクを入力してください。");
        watchToken = url.searchParams.get("watchToken") || (url.pathname === "/watch" ? url.searchParams.get("token") : "") || "";
        if (!watchToken) throw new Error("Watch管理リンクを確認してください。");
      }
      await request({ action, ...capability, profileId: profile.id, watchToken });
      const data = await request({ action: "manage", ...capability });
      setProfiles(data.profiles);
      setMessage(action === "bind_watch" ? "週次見守りを紐付けました。自動更新は別途許可してください。" : "管理状態を保存しました。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "操作できませんでした。"); }
    finally { setBusy(false); }
  }

  const watchHref = capability.watchToken ? `/watch?token=${encodeURIComponent(capability.watchToken)}` : "/manage";
  const resultHref = profiles[0]?.resultUrl || "/#scan";
  return <>
    <SiteHeader context={{ resultHref, profileHref: profileManagementHref(capability), watchHref }} />
    <main className="shell" style={{ paddingBlock: "40px", maxWidth: "900px" }}>
    <h1>公開ページの管理</h1>
    <p>公開内容・参照元を確認し、公開・停止・継続更新を管理できます。</p>
    {capability.token || capability.watchToken ? <ProfileManagementLink capability={capability} /> : null}
    {message ? <p role="status">{message}</p> : null}
    {profiles.map(({ profile, direct, resultUrl, automation }) => <section key={profile.id} className="document-note">
      <h2>{profile.brandName}</h2>
      <p>状態：{({ draft: "下書き", published: "公開中", revoked: "非公開", expired: "期限切れ" })[profile.status]} ／ 掲載期限：{new Date(profile.expiresAt).toLocaleDateString("ja-JP")}</p>
      {direct ? <p>入力情報を整理したページであり、参照元で事実確認済みとは扱いません。{resultUrl ? <a href={resultUrl} referrerPolicy="no-referrer">紐付けた診断結果を確認する</a> : "AI回答の測定はまだ紐付いていません。公開後の診断は別の処理として開始できます。"}</p> : null}
      <p>{profile.summary}</p>
      <ul>{profile.facts.map((fact, index) => <li key={index}>{fact.label}：{fact.value}{fact.provenance === "company_asserted" ? "（入力情報・参照元未確認）" : null}</li>)}</ul>
      <p>公開先：<a href={`/ai/company/${encodeURIComponent(profile.slug)}`} target="_blank" rel="noreferrer">{`/ai/company/${profile.slug}`}</a></p>
      <ul>{profile.sourcePages.map((page) => <li key={page.url}><a href={page.url} target="_blank" rel="noreferrer">{page.title || page.url}</a></li>)}</ul>
      {profile.status === "draft" ? <>
        <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />対象企業・掲載内容・公開先を確認し、公開に同意します。</label>
        <button className="button button-primary" disabled={busy || !confirmed} onClick={() => void operate(profile, "publish")}>内容を確認して公開する</button>
      </> : null}
      {profile.status === "published" ? <>
        <button className="button button-secondary" disabled={busy} onClick={() => void operate(profile, "revoke")}>公開を停止する</button>
        {direct ? <a className="button button-primary" href={`/scan?url=${encodeURIComponent(profile.targetUrl)}`} referrerPolicy="no-referrer" onClick={() => {
          if (capability.token) {
            try { sessionStorage.setItem(`rovan:pending-profile:${profile.targetUrl}`, JSON.stringify({ id: profile.id, token: capability.token })); } catch { /* Saved management link remains usable. */ }
          }
        }}>公開ページを対象にAI回答の診断を開始する</a> : null}
        <p>自動更新：{automation.enabled ? "許可済み" : "停止中"}。有効な有料の週次見守りとの紐付け・許可に基づき、同じ参照元の記載と掲載期限を週次で更新します。</p>
        <p>契約中の掲載維持：{automation.maintenanceEnabled ? "許可済み" : "停止中"}。内容の自動更新とは別に管理できます。掲載維持を停止すると無料公開期限に戻ります。</p>
        {capability.token ? <label>同じ対象のWatch管理リンク<input type="url" value={watchLink} onChange={(event) => setWatchLink(event.target.value)} autoComplete="off" /></label> : null}
        {capability.token ? <button disabled={busy || !watchLink.trim()} onClick={() => void operate(profile, "bind_watch")}>この週次見守りに管理権限を紐付ける</button> : null}
        <button disabled={busy || (!automation.enabled && !capability.watchToken && !watchLink.trim())} onClick={() => void operate(profile, automation.enabled ? "automation_disable" : "automation_enable")}>{automation.enabled ? "自動更新を停止する" : "参照元の記載・掲載期限の継続更新を許可する"}</button>
        <button disabled={busy || (!automation.maintenanceEnabled && !capability.watchToken && !watchLink.trim())} onClick={() => void operate(profile, automation.maintenanceEnabled ? "maintenance_disable" : "maintenance_enable")}>{automation.maintenanceEnabled ? "掲載維持を停止し無料期限に戻す" : "有料契約中の掲載維持だけを許可する"}</button>
        {automation.canRollback ? <button disabled={busy} onClick={() => void operate(profile, "automation_rollback")}>直前の更新を取り消して停止する</button> : null}
      </> : null}
    </section>)}
    <p><a href="/manage" referrerPolicy="no-referrer">別の管理リンクを使う</a></p>
    {capability.watchToken ? <a href={watchHref} referrerPolicy="no-referrer">週次見守りに戻る</a> : profiles[0]?.resultUrl ? <a href={resultHref} referrerPolicy="no-referrer">診断結果に戻る</a> : null}
  </main></>;
}
