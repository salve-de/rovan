"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { profileManagementHref } from "@/lib/profile-management-link";
import type { PublicProfile } from "@/lib/types";
import type { ProfileManagementCapability } from "@/lib/profile-management-link";
import { ProfileManagementLink } from "./profile-management-link";
import { displayFactLabel, displaySummary } from "@/lib/profile-display";

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
  const [message, setMessage] = useState("読み込んでいます。");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function request(body: Record<string, unknown>, signal?: AbortSignal) {
    const response = await fetch("/api/ai-profile", { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", referrerPolicy: "no-referrer", body: JSON.stringify(body), signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "読み込めませんでした。");
    return payload;
  }

  useEffect(() => {
    const controller = new AbortController();
    if (!capability.token && !capability.watchToken) { setMessage(""); return; }
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
        if (url.origin !== window.location.origin || !["/watch", "/profile/manage"].includes(url.pathname)) throw new Error("見守りの管理用リンクを貼りつけてください。");
        watchToken = url.searchParams.get("watchToken") || (url.pathname === "/watch" ? url.searchParams.get("token") : "") || "";
        if (!watchToken) throw new Error("リンクが正しくありません。見守りの管理用リンクを貼りつけてください。");
      }
      await request({ action, ...capability, profileId: profile.id, watchToken });
      const data = await request({ action: "manage", ...capability });
      setProfiles(data.profiles);
      setMessage(action === "bind_watch" ? "見守りとつなげました。" : "保存しました。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "操作できませんでした。"); }
    finally { setBusy(false); }
  }

  const watchHref = capability.watchToken ? `/watch?token=${encodeURIComponent(capability.watchToken)}` : "/manage";
  const resultHref = profiles[0]?.resultUrl || "/#scan";
  const statusLabel = { draft: "下書き・未公開", published: "公開中", revoked: "公開停止中", expired: "期限切れ" } as const;
  const hasCapability = Boolean(capability.token || capability.watchToken);
  return <>
    {hasCapability ? <SiteHeader context={{ resultHref, profileHref: profileManagementHref(capability), watchHref }} /> : <SiteHeader />}
    <main className="pm-page">
      <section className="rp-hero">
        <div className="shell rp-hero-inner">
          <div className="rp-hero-head">
            <h1>公開ページの管理</h1>
          </div>
          {capability.token || capability.watchToken ? <ProfileManagementLink capability={capability} /> : null}
        </div>
      </section>

      <div className="shell pm-body">
        {message ? <p role="status" className="pm-message">{message}</p> : null}
        {!hasCapability ? <div className="pm-empty">
          <p>管理用リンクから開いてください。</p>
          <div className="empty-actions">
            <Link className="button button-primary" href="/manage">管理用リンクで開く</Link>
            <Link className="button button-secondary" href="/">まだの方は、無料で診断する</Link>
          </div>
        </div> : null}
        {profiles.map(({ profile, direct, resultUrl, automation }) => <section key={profile.id} className="pm-card">
          <div className="pm-card-head">
            <div>
              <h2>{profile.brandName}</h2>
              <p className="pm-card-meta">公開期限：{new Date(profile.expiresAt).toLocaleDateString("ja-JP")}　<a href={`/ai/company/${encodeURIComponent(profile.slug)}`} target="_blank" rel="noreferrer">ページを見る ↗</a></p>
            </div>
            <span className={`pm-status pm-status--${profile.status}`}>{statusLabel[profile.status]}</span>
          </div>
          {direct && resultUrl ? <p className="pm-note"><a href={resultUrl} referrerPolicy="no-referrer">診断結果を見る</a></p> : null}
          {displaySummary(profile.summary) ? <p className="pm-summary">{displaySummary(profile.summary)}</p> : null}
          <dl className="pm-facts">{profile.facts.map((fact, index) => <div key={index}><dt>{displayFactLabel(fact.label)}</dt><dd>{fact.value}</dd></div>)}</dl>
          {profile.sourcePages.length ? <p className="pm-sources">情報のもと：{profile.sourcePages.map((page) => <a key={page.url} href={page.url} target="_blank" rel="noreferrer">{page.title || page.url} ↗</a>)}</p> : null}

          {profile.status === "draft" ? <div className="pm-publish">
            <label className="pm-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />この内容で公開することに同意します。</label>
            <button className="button button-primary" disabled={busy || !confirmed} onClick={() => void operate(profile, "publish")}>公開する</button>
          </div> : null}

          {profile.status === "published" ? <div className="pm-settings">
            <div className="pm-setting">
              <div><strong>自動更新</strong><span className={automation.enabled ? "pm-on" : "pm-off"}>{automation.enabled ? "オン" : "オフ"}</span><p>ホームページの内容が変わったら、毎週このページも直します（有料の見守りが必要です）。</p></div>
              <button className="button button-secondary" disabled={busy || (!automation.enabled && !capability.watchToken && !watchLink.trim())} onClick={() => void operate(profile, automation.enabled ? "automation_disable" : "automation_enable")}>{automation.enabled ? "自動更新を止める" : "自動更新をオンにする"}</button>
            </div>
            <div className="pm-setting">
              <div><strong>公開期限の自動延長</strong><span className={automation.maintenanceEnabled ? "pm-on" : "pm-off"}>{automation.maintenanceEnabled ? "オン" : "オフ"}</span><p>有料の見守り中は、公開期限を自動で延ばします。</p></div>
              <button className="button button-secondary" disabled={busy || (!automation.maintenanceEnabled && !capability.watchToken && !watchLink.trim())} onClick={() => void operate(profile, automation.maintenanceEnabled ? "maintenance_disable" : "maintenance_enable")}>{automation.maintenanceEnabled ? "自動延長を止める" : "自動延長をオンにする"}</button>
            </div>
            {capability.token ? <div className="pm-setting pm-setting--bind">
              <label>見守りの管理用リンク<input type="url" value={watchLink} onChange={(event) => setWatchLink(event.target.value)} autoComplete="off" placeholder="https://…/watch?token=…" /></label>
              <button className="button button-secondary" disabled={busy || !watchLink.trim()} onClick={() => void operate(profile, "bind_watch")}>見守りとつなげる</button>
            </div> : null}
            <div className="pm-actions">
              {direct ? <a className="button button-primary" href={`/scan?url=${encodeURIComponent(profile.targetUrl)}`} referrerPolicy="no-referrer" onClick={() => {
                if (capability.token) {
                  try { sessionStorage.setItem(`rovan:pending-profile:${profile.targetUrl}`, JSON.stringify({ id: profile.id, token: capability.token })); } catch { /* Saved management link remains usable. */ }
                }
              }}>AIの答えを調べる（無料診断）</a> : null}
              {automation.canRollback ? <button className="button button-secondary" disabled={busy} onClick={() => void operate(profile, "automation_rollback")}>最後の更新を取り消して、自動更新を止める</button> : null}
              <button className="button button-danger" disabled={busy} onClick={() => void operate(profile, "revoke")}>公開を停止する</button>
            </div>
          </div> : null}
        </section>)}
        {hasCapability && !profiles.length && !message ? <p className="pm-message">読み込んでいます…</p> : null}
        {hasCapability ? <p className="pm-links">
          <a className="document-link" href="/manage" referrerPolicy="no-referrer">別の管理用リンクで開く</a>
          {capability.watchToken ? <a href={watchHref} referrerPolicy="no-referrer">見守りに戻る</a> : profiles[0]?.resultUrl ? <a href={resultHref} referrerPolicy="no-referrer">診断結果に戻る</a> : null}
        </p> : null}
      </div>
    </main>
    <SiteFooter />
  </>;
}
