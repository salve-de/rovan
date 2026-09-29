"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowIcon } from "@/components/icons";
import type { PublicProfile, ScanResult } from "@/lib/types";

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

  // サイト解析結果から抽出した特徴候補。公開内容を自動で増やすものではありません。
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
            if (!response.ok) throw new Error("下書きを復元できませんでした。");
            const data = await response.json();
            const restored = profileFromPayload(data.profiles?.[0]);
            if (restored) { setProfile(restored); setProfileToken(token); setIsSaved(true); }
          }).catch(() => { if (!controller.signal.aborted) setError("保存済みの下書きを復元できませんでした。再読み込みしてお試しください。"); });
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
      if (!response.ok) throw new Error(payload.error || "公開情報の下書きを作成できませんでした。");
      const next = profileFromPayload(payload);
      if (!next || !payload.token) throw new Error("公開前の下書きを取得できませんでした。");
      setProfile(next);
      setDraftStrategyId(strategies[selectedStrategy]?.id || "");
      setProfileToken(payload.token);
      try { sessionStorage.setItem(`rovan:profile:${result.scanId}`, JSON.stringify({ id: next.id, token: payload.token })); }
      catch { setError("このブラウザーではタブ内の管理情報を保存できません。下にある管理リンクを保存してください。"); }
      setIsSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "公開情報の下書きを作成できませんでした。");
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

  return (
    <section className="public-profile-interactive-card" aria-label="AI推薦データの作成・公開">
      {/* AI下書きガイド案内 */}
      <div className="profile-draft-guide">
        <span className="profile-draft-guide-label">
          御社の強みの候補（1つ選んでください）
        </span>
        <span className="profile-draft-guide-note">※ 公開ページに載せるのは参照元で確認できる情報だけです</span>
      </div>

      {/* 3つの強み選択ラジオカード（無料プランは1枠のみ選択可能） */}
      {!hideStrategySelector ? <div className="weapon-selector-grid">
        {strategies.map((strat, index) => {
          const isSelected = selectedStrategy === index;
          const isRec = strat.isRecommended ?? index === 0;
          return (
            <div
              key={strat.code}
              className={`weapon-card ${isSelected ? "selected" : ""} ${isRec ? "recommended-card" : ""}`}
              onClick={() => selectStrategy(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectStrategy(index);
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
            >
              {isRec ? (
              <div className="card-top-recommend-badge">
                  おすすめ
                </div>
              ) : null}
              <div className="weapon-card-header">
                <span className={`weapon-radio ${isSelected ? "is-selected" : ""}`}>
                  {isSelected ? "選択中" : "選択する"}
                </span>
                <span className="weapon-tag">{strat.code}</span>
              </div>
              <h3>{strat.name}</h3>
              <p className="weapon-desc">{strat.coreThesis}</p>
              <small className="weapon-target">こんなお客さんに：{strat.targetMarket}</small>
            </div>
          );
        })}
      </div> : null}

      {/* Rovanからの分析所見 */}
      <div className="rovan-hot-advice-card">
        <div className="hot-advice-header">
          <span className="hot-advice-tag">この強みを選んだ理由</span>
          <h3>「{strategies[selectedStrategy]?.name || "固有の特徴"}」を軸に、大手と差別化する</h3>
        </div>
        <p className="hot-advice-body">
          {strategies[selectedStrategy]?.passionateReason ||
            `公開情報から抽出した候補です。実績・料金・資格などの記載がない事項は推測せず、公開前の下書きで確認できる範囲に限定します。`}
        </p>
      </div>

      {/* 無料枠 vs フル見守りプラン 機能格差スペック表 */}
      {/* 書き込み実行アクション */}
      <div className="weapon-action-box">
        <div className="weapon-action-status">
          <p>
            公開前に確認する下書き：<strong>{result.discovery.brandName || "対象企業"}</strong>
          </p>
          <small>自社サイトを改修せず、参照元付きの公開情報を確認してから公開できます。</small>
        </div>

        <div className="weapon-action-buttons">
          {!isSaved ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => void deployProfile()}
              disabled={busy !== ""}
            >
              {busy === "deploy" ? "下書きを作成中…" : "この強みでページの下書きをつくる（無料）"} <ArrowIcon />
            </button>
          ) : (
            <div className="saved-success-box">
              {profile ? <div className="document-note">
                <h3>{profile.brandName}</h3><p>{profile.summary}</p>
                <ul>{profile.facts.map((fact, index) => <li key={index}>{fact.label}：{fact.value}</li>)}</ul>
                <p>参照元：</p><ul>{profile.sourcePages.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a></li>)}</ul>
                <p>公開状態：{profile.status === "published" ? "公開中" : profile.status === "revoked" ? "非公開" : profile.status === "expired" ? "期限切れ" : "下書き"}。選択した候補に関連する参照元の記載だけを掲載します。候補を変える場合は下書きを作り直してください。</p>
                {!profile.facts.length ? <p>この候補を裏付ける参照元の短い記載を確認できませんでした。戦略案を会社の事実として追加していません。</p> : null}
                {draftMismatch ? <p role="alert">選択した候補が変わりました。公開前に下書きを作り直してください。</p> : null}
                {!sample && profileToken ? <ProfileManagementLink capability={{ profileId: profile.id, token: profileToken }} /> : null}
              </div> : null}
              <span className="saved-badge">
                {sample ? "見本です。実際はここで下書きの中身を確かめてから公開します（見本では公開・契約は行われません）。" : isPublished ? "公開しました：AIが読める御社のページができました。" : "下書きができました。中身を確かめて、よければ公開してください。"}
              </span>
              <div className="saved-links">
                {isPublished ? (
                  <>
                    <Link
                      className="button button-primary"
                      href={sample ? "/ai/company/aoba-souzoku?sample=1" : (profile ? `/ai/company/${encodeURIComponent(profile.slug)}` : "#")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      公開したページを見る <ArrowIcon />
                    </Link>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        const targetPath = sample ? "/ai/company/aoba-souzoku?sample=1" : (profile ? `/ai/company/${encodeURIComponent(profile.slug)}` : "");
                        if (targetPath && typeof window !== "undefined") {
                          const fullUrl = `${window.location.origin}${targetPath}`;
                          void navigator.clipboard.writeText(fullUrl);
                          alert("公開情報参照ページのURLをコピーしました。掲載内容を確認したうえでご利用ください。");
                        }
                      }}
                    >
                      公開ページのURLをコピー
                    </button>
                    {!sample ? <button type="button" className="button button-secondary" disabled={busy !== ""} onClick={() => void publishProfile("revoke")}>公開を停止する</button> : null}
                  </>
                ) : (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => void publishProfile()}
                    disabled={busy !== "" || draftMismatch || profile?.status === "revoked" || profile?.status === "expired"}
                  >
                    {busy === "deploy" ? "公開処理中…" : "内容を確認して公開する"} <ArrowIcon />
                  </button>
                )}
                <a className="button button-secondary" href="#step-3">次へ：毎週の見守りを始める（14日間無料）</a>
              </div>
              <button
                type="button"
                className="saved-redo"
                disabled={busy !== "" || (!sample && profile?.status === "published")}
                onClick={() => setIsSaved(false)}
              >
                別の強みで下書きを作り直す
              </button>

            </div>
          )}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
