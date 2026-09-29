"use client";

import { useEffect, useState } from "react";
import type { PublicProfileFact } from "@/lib/types";
import { profileManagementHref } from "@/lib/profile-management-link";
import { displayFactLabel } from "@/lib/profile-display";

type Automation = { enabled: boolean; maintenanceEnabled: boolean; lastUpdatedAt: string | null; canRollback: boolean; changedFactCount: number; previousFacts: PublicProfileFact[]; currentFacts: PublicProfileFact[] };

export function ProfileAutomationControls({ scanId, watchToken, sample = false, hasPublicPage = false }: { scanId: string; watchToken: string; sample?: boolean; hasPublicPage?: boolean }) {
  const [management, setManagement] = useState<{ id: string; token: string } | null>(null);
  const [state, setState] = useState<Automation | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (sample) return;
    const controller = new AbortController();
    void (async () => {
      const lookup = (auth: Record<string, string>) => fetch("/api/ai-profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "manage", ...auth }), cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal });
      let response = await lookup({ watchToken });
      let ownerToken = "";
      if (!response.ok) {
        // Legacy storage is only a convenience: the server must still validate the owner token.
        let saved: { id?: string; token?: string } | null = null;
        try { saved = JSON.parse(sessionStorage.getItem(`rovan:profile:${scanId}`) || "null"); } catch { /* Management link works without storage. */ }
        if (!saved?.id || !saved?.token) return;
        ownerToken = saved.token;
        response = await lookup({ profileId: saved.id, token: saved.token });
      }
      if (!response.ok) throw new Error("公開ページの状態を読み込めませんでした。");
      const payload = await response.json();
      const selected = payload.profiles?.[0];
      if (selected) { setManagement({ id: selected.profile.id, token: ownerToken }); setState(selected.automation); }
    })().catch((caught) => { if (!controller.signal.aborted) setError(caught.message); });
    return () => controller.abort();
  }, [scanId, watchToken, sample]);

  async function operate(action: "enable" | "disable" | "rollback") {
    if (!management || sample) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/ai-profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: `automation_${action}`, profileId: management.id, token: management.token, watchToken }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "保存できませんでした。");
      setState(payload.automation);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存できませんでした。"); }
    finally { setBusy(false); }
  }

  const updatedAt = state?.lastUpdatedAt ? new Date(state.lastUpdatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }) : "";
  return <section className="watch-section shell wt-auto" aria-label="ページの自動更新">
    <h2>ページの自動更新</h2>
    <p>御社のホームページの料金・対応地域などが変わったら、公開ページも毎週自動で直します。</p>
    {sample ? <p>見本では操作できません。</p> : !management ? (hasPublicPage
      ? <p>公開ページの管理用リンクから開くと、自動更新を設定できます。</p>
      : <p>公開ページがまだありません。<a className="document-link" href={`/result?id=${encodeURIComponent(scanId)}#step-2`}>公開ページをつくる</a></p>) : <>
      <p role="status"><strong>自動更新：{state ? state.enabled ? "オン" : "オフ" : "確認しています"}</strong>{updatedAt ? `（最後の更新：${updatedAt}・${state?.changedFactCount}件）` : ""}</p>
      <button type="button" className="button button-primary" disabled={busy || !state} onClick={() => void operate(state?.enabled ? "disable" : "enable")}>{state?.enabled ? "自動更新を止める" : "自動更新をオンにする"}</button>
      {state?.enabled ? <p>止めても、ページの公開は続きます。</p> : null}
      {state?.canRollback ? <button type="button" className="button button-secondary" disabled={busy} onClick={() => void operate("rollback")}>最後の更新を取り消して、自動更新を止める</button> : null}
      {state?.canRollback ? <details><summary>最後の更新の中身を見る</summary><h3>更新前</h3><ul>{state.previousFacts.map((fact, index) => <li key={index}>{displayFactLabel(fact.label)}：{fact.value} <a href={fact.sourceUrl} target="_blank" rel="noreferrer">出典</a></li>)}</ul><h3>更新後</h3><ul>{state.currentFacts.map((fact, index) => <li key={index}>{displayFactLabel(fact.label)}：{fact.value} <a href={fact.sourceUrl} target="_blank" rel="noreferrer">出典</a></li>)}</ul></details> : null}
      <a className="document-link" href={profileManagementHref({ watchToken })} referrerPolicy="no-referrer">公開ページの管理画面を開く</a>
    </>}
    {error ? <p role="alert" className="form-error">{error}</p> : null}
  </section>;
}
