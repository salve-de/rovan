"use client";

import { useEffect, useState } from "react";
import type { PublicProfileFact } from "@/lib/types";
import { profileManagementHref } from "@/lib/profile-management-link";

type Automation = { enabled: boolean; maintenanceEnabled: boolean; lastUpdatedAt: string | null; canRollback: boolean; changedFactCount: number; previousFacts: PublicProfileFact[]; currentFacts: PublicProfileFact[] };

export function ProfileAutomationControls({ scanId, watchToken, sample = false }: { scanId: string; watchToken: string; sample?: boolean }) {
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
      if (!response.ok) throw new Error("公開ページの管理状態を取得できませんでした。");
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

  return <section className="watch-section shell wt-auto" aria-label="AI推薦データの自動更新">
    <p className="overline">ページの自動更新</p>
    <h2>元の情報が変わったら、ページも自動で最新に。</h2>
    <p>一度許可すれば、毎週の処理で、元のサイトに書かれた料金・対応地域・得意分野などを出典つきで追加・更新します。御社のサイトや紹介文は書きかえません。有料契約中は掲載期限も自動で延長します。</p>
    <p className="wt-auto-note">Rovanの公開情報ページです。AI事業者による認定・登録を示すものではありません。</p>
    {!sample ? <a href={profileManagementHref({ watchToken })} referrerPolicy="no-referrer">公開ページの管理画面を開く</a> : null}
    {sample ? <p>見本です。実際の自動更新・公開操作は行われません。</p> : !management ? <p>保存した公開ページの管理リンクから、この週次見守りの管理リンクを指定して紐付けてください。紐付け後は新しいタブでも管理できます。</p> : <>
      <p role="status">自動更新：{state ? state.enabled ? "許可済み" : "停止中" : "確認中"}{state?.lastUpdatedAt ? `／直近の反映：${new Date(state.lastUpdatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}（${state.changedFactCount}件の差分）` : ""}</p>
      <button type="button" className="button button-primary" disabled={busy || !state} onClick={() => void operate(state?.enabled ? "disable" : "enable")}>{state?.enabled ? "自動更新を停止する" : "参照元の記載の自動更新を許可する"}</button>
      <p>内容の自動更新を停止しても、許可済みの掲載維持は継続します。掲載維持の停止・公開停止は管理画面で行えます。</p>
      {state?.canRollback ? <button type="button" className="button button-secondary" disabled={busy} onClick={() => void operate("rollback")}>直前の更新を取り消し、自動更新を停止する</button> : null}
      {state?.canRollback ? <details><summary>直前の更新内容を見る</summary><h3>更新前</h3><ul>{state.previousFacts.map((fact, index) => <li key={index}>{fact.label}：{fact.value} <a href={fact.sourceUrl} target="_blank" rel="noreferrer">出典</a></li>)}</ul><h3>更新後</h3><ul>{state.currentFacts.map((fact, index) => <li key={index}>{fact.label}：{fact.value} <a href={fact.sourceUrl} target="_blank" rel="noreferrer">出典</a></li>)}</ul></details> : null}
    </>}
    {error ? <p role="alert" className="form-error">{error}</p> : null}
  </section>;
}
