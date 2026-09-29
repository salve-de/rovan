"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowIcon } from "@/components/icons";
import type { PublicProfile, ScanResult } from "@/lib/types";
import { displayFactLabel, displaySummary } from "@/lib/profile-display";

import { derivePositioningAdvice } from "@/lib/positioning";
import { ProfileManagementLink } from "./profile-management-link";

type ProfileShape = PublicProfile;

type PublicProfileActionsProps = {
  result: ScanResult;
  sample?: boolean;
  selectedStrategyId?: string;
  onStrategyChange?: (strategyId: string) => void;
  hideStrategySelector?: boolean;
};

function profileFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const candidate = (payload as { profile?: unknown }).profile;
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as ProfileShape;
}

/**
 * Publishing is deliberately a second, explicit action. A scan never writes
 * to the customer's site and never creates an Rovan public page by itself.
 */
export function PublicProfileActions({ result, sample = false, selectedStrategyId, onStrategyChange, hideStrategySelector = false }: PublicProfileActionsProps) {
  const [profile, setProfile] = useState<ProfileShape | null>(null);
  const [profileToken, setProfileToken] = useState("");
  const [busy, setBusy] = useState<"deploy" | "">("");
  const [error, setError] = useState("");
  const [localStrategy, setSelectedStrategy] = useState<number>(0);
  const [draftStrategyId, setDraftStrategyId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // 強みの候補（会社の解析と、名前が出なかった質問から作る）。選んだ強みは、ページに載せる情報を選ぶ手がかりになる
  const strategies = result.positioning?.strategies || derivePositioningAdvice(result).strategies || [];
  const selectedStrategy = selectedStrategyId === undefined ? localStrategy : Math.max(0, strategies.findIndex((item) => item.id === selectedStrategyId));
  const draftMismatch = draftStrategyId !== null && draftStrategyId !== (strategies[selectedStrategy]?.id || "");
  const selectStrategy = (index: number) => { if (!isSaved) { setSelectedStrategy(index); onStrategyChange?.(strategies[index].id); } };
  const isPublished = sample || profile?.status === "published";

  useEffect(() => {
    if (sample) return;
    const controller = new AbortController();
    try {
      const saved = JSON.parse(sessionStorage.getItem(`rovan:profile:${result.scanId}`) || "null") as { id?: string; token?: string } | null;
      if (saved?.id && saved.token) {
        const token = saved.token;
        void fetch("/api/ai-profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "manage", profileId: saved.id, token }), signal: controller.signal, cache: "no-store", referrerPolicy: "no-referrer" })
          .then(async (response) => {
            if (!response.ok) throw new Error("下書きを開けませんでした。");
            const data = await response.json();
            const restored = profileFromPayload(data.profiles?.[0]);
            if (restored) { setProfile(restored); setProfileToken(token); setIsSaved(true); }
          }).catch(() => { if (!controller.signal.aborted) setError("前につくった下書きを開けませんでした。ページを再読み込みしてください。"); });
      }
    } catch { /* Storage may be unavailable in private browsing. */ }
    return () => controller.abort();
  }, [result.scanId, sample]);

  async function deployProfile() {
    if (sample) {
      setIsSaved(true);
      return;
    }
    setBusy("deploy");
    setError("");
    try {
      const response = await fetch("/api/ai-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanId: result.scanId, action: "preview", strategyId: strategies[selectedStrategy]?.id || "" }),
      });
      const payload = await response.json() as { error?: string; token?: string; profile?: ProfileShape };
      if (!response.ok) throw new Error(payload.error || "下書きをつくれませんでした。もう一度お試しください。");
      const next = profileFromPayload(payload);
      if (!next || !payload.token) throw new Error("下書きをつくれませんでした。もう一度お試しください。");
      setProfile(next);
      setDraftStrategyId(strategies[selectedStrategy]?.id || "");
      setProfileToken(payload.token);
      try { sessionStorage.setItem(`rovan:profile:${result.scanId}`, JSON.stringify({ id: next.id, token: payload.token })); }
      catch { setError("このブラウザーでは下書きを覚えておけません。下の管理用リンクをコピーして保存してください。"); }
      setIsSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "下書きをつくれませんでした。もう一度お試しください。");
    } finally {
      setBusy("");
    }
  }

  async function publishProfile(action: "publish" | "revoke" = "publish") {
    if (sample || !profile || !profileToken || (action === "publish" && draftMismatch)) return;
    setBusy("deploy");
    setError("");
    try {
      const response = await fetch("/api/ai-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, profileId: profile.id, token: profileToken }),
      });
      const payload = await response.json() as { error?: string; profile?: ProfileShape };
      if (!response.ok || !payload.profile) throw new Error(payload.error || "公開できませんでした。");
      setProfile(payload.profile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "公開できませんでした。");
    } finally {
      setBusy("");
    }
  }

  const radioName = `strength-${result.scanId}`;
  const publicPath = sample ? "/ai/company/aoba-souzoku?sample=1" : (profile ? `/ai/company/${encodeURIComponent(profile.slug)}` : "");
  const statusLabel = !profile ? "" : profile.status === "published" ? "公開中" : profile.status === "revoked" ? "公開停止中" : profile.status === "expired" ? "期限切れ" : "下書き・未公開";

  async function copyPublicUrl() {
    if (!publicPath) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); }
    catch { setError("コピーできませんでした。「公開したページを見る」から開いて、アドレスをコピーしてください。"); }
  }

  return (
    <section className="public-profile-interactive-card" aria-label="公開ページをつくる">
      {!hideStrategySelector && !isSaved && strategies.length ? (
        <fieldset className="strength-picker">
          <legend className="strength-picker-legend">強みを1つ選ぶ</legend>
          <div className="weapon-selector-grid">
            {strategies.map((strat, index) => {
              const isSelected = selectedStrategy === index;
              const isRec = strat.isRecommended ?? index === 0;
              return (
                <label key={strat.id || strat.code} className={`weapon-card${isSelected ? " selected" : ""}`}>
                  <input type="radio" className="weapon-radio-input" name={radioName} checked={isSelected} onChange={() => selectStrategy(index)} />
                  {isRec ? <span className="card-top-recommend-badge">おすすめ</span> : null}
                  <strong className="weapon-card-title">{strat.name}</strong>
                  {strat.coreThesis ? <span className="weapon-desc">{strat.coreThesis}</span> : null}
                  {strat.targetMarket ? <span className="weapon-target">こんなお客さんに：{strat.targetMarket}</span> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {!isSaved ? (
        <div className="weapon-action-box">
          <button type="button" className="button button-primary" onClick={() => void deployProfile()} disabled={busy !== ""}>
            {busy === "deploy" ? "下書きをつくっています…" : strategies.length ? "この強みでページの下書きをつくる（無料）" : "ページの下書きをつくる（無料）"} <ArrowIcon />
          </button>
        </div>
      ) : (
        <div className="profile-draft-result">
          {profile ? (
            <article className="profile-preview" aria-label="ページの中身">
              <div className="profile-preview-head">
                <span className={`profile-status profile-status--${profile.status}`}>{statusLabel}</span>
                <strong>{profile.brandName}</strong>
              </div>
              {displaySummary(profile.summary) ? <p>{displaySummary(profile.summary)}</p> : null}
              {profile.facts.length ? (
                <dl className="profile-preview-facts">
                  {profile.facts.map((fact, index) => <div key={index}><dt>{displayFactLabel(fact.label)}</dt><dd>{fact.value}</dd></div>)}
                </dl>
              ) : null}
              {profile.sourcePages.length ? (
                <p className="profile-preview-sources">情報のもと：{profile.sourcePages.map((source, index) => <span key={source.url}>{index ? "、" : ""}<a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a></span>)}</p>
              ) : null}
            </article>
          ) : sample ? <p className="profile-sample-note">見本のため、実際には公開されません。</p> : null}
          {draftMismatch ? <p className="form-error" role="alert">強みを変えたので、下書きをつくり直してください。</p> : null}

          <div className="saved-links">
            {isPublished ? (
              <>
                <Link className="button button-primary" href={publicPath || "#"} target="_blank" rel="noreferrer">公開したページを見る <ArrowIcon /></Link>
                <button type="button" className="button button-secondary" onClick={() => void copyPublicUrl()}>{urlCopied ? "コピーしました" : "ページのURLをコピー"}</button>
                {!sample ? <button type="button" className="button button-secondary" disabled={busy !== ""} onClick={() => void publishProfile("revoke")}>公開を停止する</button> : null}
              </>
            ) : profile && profile.status === "draft" ? (
              <button type="button" className="button button-primary" onClick={() => void publishProfile()} disabled={busy !== "" || draftMismatch}>
                {busy === "deploy" ? "公開しています…" : "この内容で公開する"} <ArrowIcon />
              </button>
            ) : null}
            <a className="button button-secondary" href="#step-3">次へ：毎週の見守り（14日間無料）</a>
          </div>
          {!(profile?.status === "published" && !sample) ? (
            <button type="button" className="saved-redo" disabled={busy !== ""} onClick={() => setIsSaved(false)}>
              別の強みでつくり直す
            </button>
          ) : null}
          {!sample && profile && profileToken ? <ProfileManagementLink capability={{ profileId: profile.id, token: profileToken }} /> : null}
        </div>
      )}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}
