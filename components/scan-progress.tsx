"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ArrowIcon } from "@/components/icons";
import { isUrlInput } from "@/lib/input-kind";
import { parseSocialInput } from "@/lib/social-input";
import type { InputResolutionCandidate } from "@/lib/input-resolution";
import type { ScanProgressEvent, ScanStage } from "@/lib/types";
import { profileManagementHref } from "@/lib/profile-management-link";
import { ProfileManagementLink } from "./profile-management-link";

const steps: Array<{ stage: ScanStage; label: string }> = [
  { stage: "validating", label: "診断先の確認" },
  { stage: "crawling", label: "ホームページを読む" },
  { stage: "discovering", label: "比べる相手を探す" },
  { stage: "prompting", label: "質問をつくる" },
  { stage: "measuring", label: "AIに聞く" },
  { stage: "analyzing", label: "結果をまとめる" },
];

type ResolutionPayload = {
  candidates?: InputResolutionCandidate[];
  error?: string;
};

function normalize(value: string | null) {
  const raw = value?.trim() || "";
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) || /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function hostOf(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
}

function displayInput(value: string) {
  return value.length > 72 ? `${value.slice(0, 72)}…` : value;
}

// サーバー側が「いまは診断できない」状態（AIや保存先の準備ができていない）を返したとき
function isServiceUnavailableError(message: string) {
  return /準備中|いまは診断できません|設定が必要/.test(message);
}

export function ScanProgress() {
  const router = useRouter();
  const params = useSearchParams();
  const rawInput = useMemo(() => (params.get("input") || params.get("url") || "").trim(), [params]);
  const extraUrl = params.get("extraUrl");
  const extraSocial = params.get("extraSocial");
  const extraProduct = params.get("extraProduct");
  const inputKind = params.get("kind");
  const socialInfo = useMemo(() => parseSocialInput(rawInput || extraSocial || ""), [extraSocial, rawInput]);
  const directUrl = useMemo(() => isUrlInput(rawInput) ? normalize(rawInput) : extraUrl && isUrlInput(extraUrl) ? normalize(extraUrl) : "", [extraUrl, rawInput]);
  const controller = useRef<AbortController | null>(null);
  const resolvedInput = useRef("");
  const [phase, setPhase] = useState<"resolving" | "choose" | "scanning" | "failed" | "no_input" | "no_site" | "social_site" | "product_site" | "direct_preview">("resolving");
  const [candidates, setCandidates] = useState<InputResolutionCandidate[]>([]);
  const [selectedUrl, setSelectedUrl] = useState("");
  const [stage, setStage] = useState<ScanStage>("created");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("診断を準備しています。");
  const [detail, setDetail] = useState("診断先を確認しています");
  const [error, setError] = useState("");
  const [directBrandName] = useState(
    extraProduct ? extraProduct : socialInfo.username ? socialInfo.username : rawInput
  );
  const [directCreating, setDirectCreating] = useState(false);
  const [altUrl, setAltUrl] = useState("");
  const [directDraft, setDirectDraft] = useState<{ profileId: string; token: string; slug: string } | null>(null);

  const createDirectProfile = useCallback(async () => {
    setDirectCreating(true);
    setError("");
    try {
      const finalBrand = (directBrandName || rawInput).trim();
      // 公開ページの説明文になるので、お店の情報以外は入れない
      const summaryParts = extraProduct ? `${finalBrand}の${extraProduct}。` : "";

      const response = await fetch("/api/ai-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_direct",
          brandName: finalBrand,
          referenceUrl: socialInfo.originalUrl || parseSocialInput(extraSocial || "").originalUrl || extraUrl || "",
          summary: summaryParts,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.slug || !data.profile?.id || !data.token) throw new Error(data.error || "下書きをつくれませんでした。もう一度お試しください。");
      setDirectDraft({ profileId: data.profile.id, token: data.token, slug: data.slug });
      setPhase("direct_preview");
      setDirectCreating(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "下書きをつくれませんでした。もう一度お試しください。");
      setDirectCreating(false);
    }
  }, [directBrandName, extraProduct, extraSocial, extraUrl, rawInput, socialInfo.originalUrl]);

  const publishDirectProfile = useCallback(async () => {
    if (!directDraft) return;
    setDirectCreating(true);
    setError("");
    try {
      const response = await fetch("/api/ai-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", profileId: directDraft.profileId, token: directDraft.token }),
      });
      const data = await response.json();
      if (!response.ok || data.profile?.status !== "published") throw new Error(data.error || "公開ページを公開できませんでした。");
      router.push(profileManagementHref({ profileId: directDraft.profileId, token: directDraft.token }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "公開ページを公開できませんでした。");
      setDirectCreating(false);
    }
  }, [directDraft, router]);

  const startScan = useCallback(async (inputUrl: string, nameOnly = "") => {
    const targetUrl = normalize(inputUrl);
    if (!targetUrl && !nameOnly) {
      setPhase("failed");
      setError("診断する公開サイトがありません。");
      return;
    }
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setPhase("scanning");
    setError("");
    setStage("created");
    setProgress(0);
    setMessage("診断を準備しています。");
    setDetail("診断先を確認しています");
    try {
      const response = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify(targetUrl ? { url: targetUrl } : { name: nameOnly }), signal: abort.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        if (!targetUrl) {
          // ホームページなしの診断は、先に御社のページの下書きをつくってから行う
          setPhase("no_site");
          setError(data.error || "ホームページなしの診断は、先に御社のページの下書きをつくってから行います。");
          return;
        }
        throw new Error(data.error || `診断を開始できませんでした (${response.status})`);
      }
      if (!response.body) throw new Error("診断の進行状況を取得できませんでした。");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) throw new Error("診断の接続が完了前に切れました。もう一度お試しください。");
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ({ type: "accepted" | "progress" | "complete" | "error"; scanId?: string; error?: string } & Partial<ScanProgressEvent>);
          if (event.type === "progress") {
            if (event.stage) setStage(event.stage);
            if (typeof event.progress === "number") setProgress(event.progress);
            if (event.message) setMessage(event.message);
            if (event.detail) setDetail(event.detail);
          }
          if (event.type === "complete" && event.scanId) {
            try {
              const key = `rovan:pending-profile:${targetUrl}`;
              const saved = sessionStorage.getItem(key);
              if (saved) { sessionStorage.setItem(`rovan:profile:${event.scanId}`, saved); sessionStorage.removeItem(key); }
            } catch { /* The saved owner link is the durable recovery path. */ }
            setProgress(100); setStage("complete"); setMessage("結果をまとめました。");
            router.replace(`/result?id=${encodeURIComponent(event.scanId)}`);
            return;
          }
          if (event.type === "error") throw new Error(event.error || "診断に失敗しました。");
        }
      }
    } catch (caught) {
      if (abort.signal.aborted) return;
      setPhase("failed");
      setStage("failed");
      setError(caught instanceof Error ? caught.message : "診断に失敗しました。");
    }
  }, [router]);

  useEffect(() => {
    controller.current?.abort();
    if (!rawInput) {
      // No diagnosis target was given — send the user back to the input form
      // instead of showing a dead-end error screen.
      router.replace("/");
      setPhase("no_input");
      return () => undefined;
    }
    if (socialInfo.isSocial) {
      setPhase("social_site");
      setMessage("");
      setDetail("");
      return () => undefined;
    }
    if (inputKind === "product") {
      setPhase("product_site");
      setMessage("");
      setDetail("");
      return () => undefined;
    }
    if (directUrl) {
      // Each effect owns a request; React may clean up and restart the effect.
      // A remembered URL must not suppress the replacement for an aborted request.
      void startScan(directUrl);
      return () => controller.current?.abort();
    }
    if (resolvedInput.current === rawInput && candidates.length) return () => controller.current?.abort();
    resolvedInput.current = rawInput;
    const abort = new AbortController();
    controller.current = abort;
    setPhase("resolving");
    setCandidates([]);
    setSelectedUrl("");
    setError("");
    setMessage("ホームページを探しています。");
    setDetail("");
    async function resolve() {
      try {
        const response = await fetch("/api/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: rawInput }), signal: abort.signal });
        const data = await response.json().catch(() => ({})) as ResolutionPayload;
        if (!response.ok) throw new Error(data.error || "ホームページを探せませんでした。");
        const nextCandidates = Array.isArray(data.candidates) ? data.candidates.filter((candidate) => candidate?.url) : [];
        if (!nextCandidates.length) {
          setPhase("no_site");
          setMessage("");
          setDetail("");
          return;
        }
        setCandidates(nextCandidates);
        setSelectedUrl(nextCandidates[0].url);
        setPhase("choose");
        setMessage("");
        setDetail("");
      } catch (caught) {
        if (abort.signal.aborted) return;
        setPhase("failed");
        setError(caught instanceof Error ? caught.message : "ホームページを探せませんでした。");
      }
    }
    void resolve();
    return () => abort.abort();
  }, [candidates.length, directUrl, inputKind, rawInput, router, socialInfo.isSocial, startScan]);

  const targetHost = hostOf(selectedUrl || directUrl);
  const isDirectTarget = isUrlInput(rawInput);
  const activeIndex = steps.findIndex((item) => item.stage === stage);
  const completedCount = stage === "complete" ? steps.length : Math.max(0, activeIndex);

  if (phase === "no_input") {
    return <main className="scan-page">
      <SiteHeader compact />
      <ScanSteps current={1} />
      <section className="scan-stage shell scan-resolve-stage">
        <div className="scan-stage-main scan-resolve-main">
          <p className="overline">診断先が未入力です</p>
          <h1>診断する会社名・店舗名・サービス名またはURLを入力してください。</h1>
          <p className="scan-message">ホーム画面に移動します。移動しない場合は下のボタンからお進みください。</p>
          <button className="button button-primary scan-resolve-start" type="button" onClick={() => router.push("/")}>ホームへ移動する <ArrowIcon /></button>
        </div>
      </section>
    </main>;
  }

  if (phase === "social_site" || phase === "product_site" || phase === "no_site" || phase === "direct_preview") {
    const isSocial = phase === "social_site";
    const isProduct = phase === "product_site";
    const isDirectPreview = phase === "direct_preview";

    const badgeText = isSocial
      ? (socialInfo.displayLabel || "Instagramから")
      : isProduct
      ? "商品・サービス"
      : isDirectPreview
      ? "公開前の確認"
      : "ホームページなし";

    const titleText = isSocial
      ? `Instagram「${displayInput(rawInput)}」から診断を始めます`
      : isProduct
      ? `「${displayInput(rawInput)}」の診断を始めます`
      : isDirectPreview
      ? `「${displayInput(directBrandName || rawInput)}」のページを確認してください`
      : `「${displayInput(rawInput)}」の診断を始めます`;


    const brandLabel = isSocial
      ? "店舗名・屋号・ブランド名"
      : isProduct
      ? "商品名・サービス名（ブランド名）"
      : "会社名・屋号（表示名）";

    const buttonText = isDirectPreview ? "この内容で公開する" : "この名前で下書きをつくる（無料）";


    return (
      <main className="scan-page">
        <SiteHeader compact />
        <section className="direct-entry-stage shell">
          <ScanSteps current={1} />
          <div className="no-site-card">
            <div className="no-site-tag-row">
              <span className={`no-site-tag${isSocial ? " no-site-tag--social" : isProduct ? " no-site-tag--product" : ""}`}>
                {badgeText}
              </span>
            </div>
            <h1>{titleText}</h1>

            {isDirectPreview ? <div className="no-site-form-grid no-site-form-grid--single">
              <div className="no-site-input-group">
                <span>{isDirectPreview ? "公開する名称" : brandLabel}</span>
                <p className="input-readonly">{directBrandName || rawInput}</p>
              </div>
              {isDirectPreview ? (
                <div className="no-site-input-group">
                  <span>載せる情報</span>
                  <p className="no-site-input-note">名前{extraSocial || socialInfo.isSocial ? "・SNS" : ""}{extraProduct ? "・商品／サービス名" : ""}{extraUrl ? "・URL" : ""}</p>
                </div>
              ) : null}
            </div> : null}

            <div className="no-site-action-row">
              {!isDirectPreview ? <div className="no-site-target-brand">
                <span>この名前で調べます</span>
                <strong>{socialInfo.displayLabel || directBrandName || rawInput}</strong>
              </div> : null}
              {isDirectPreview ? (
                <button className="button button-primary scan-resolve-start" type="button" disabled={directCreating} onClick={() => void publishDirectProfile()}>
                  {directCreating ? "公開しています…" : buttonText} <ArrowIcon />
                </button>
              ) : (
                <button className="button button-primary scan-resolve-start" type="button" disabled={directCreating} onClick={() => void startScan("", directBrandName || rawInput)}>
                  この名前で診断する（無料） <ArrowIcon />
                </button>
              )}
            </div>
            {!isDirectPreview ? (
              <form className="no-site-url-row" onSubmit={(event) => { event.preventDefault(); if (altUrl.trim()) void startScan(altUrl.trim()); }}>
                <label htmlFor="no-site-url">ホームページのURL（あれば）</label>
                <div>
                  <input id="no-site-url" type="url" inputMode="url" placeholder="https://" value={altUrl} onChange={(event) => setAltUrl(event.target.value)} />
                  <button className="button button-secondary" type="submit" disabled={!altUrl.trim()}>このURLで診断</button>
                </div>
              </form>
            ) : null}
            {!isDirectPreview ? (
              <button className="text-button no-site-draft-link" type="button" disabled={directCreating} onClick={() => void createDirectProfile()}>
                {directCreating ? "下書きをつくっています…" : "先にAIが読めるページの下書きをつくる →"}
              </button>
            ) : null}
            {directDraft ? <ProfileManagementLink capability={{ profileId: directDraft.profileId, token: directDraft.token }} /> : null}
            {error ? <p className="form-error no-site-error">{error}</p> : null}
          </div>
          <div className="no-site-back-row">
            <button className="button button-secondary" type="button" aria-label={isDirectPreview ? "下書きに戻る" : "入力をやり直す"} onClick={() => {
              if (isDirectPreview) {
                setDirectDraft(null);
                setPhase("no_site");
                setError("");
                return;
              }
              router.push("/");
            }}>
              ← {isDirectPreview ? "下書きに戻る" : "入力をやり直す"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (phase !== "scanning") {
    return <main className="scan-page">
      <SiteHeader compact />
      <section className="scan-stage shell scan-resolve-stage">
        <div className="scan-stage-main scan-resolve-main">
          <h1>
            {phase === "failed"
              ? (isServiceUnavailableError(error) ? "いまは診断できません" : isDirectTarget ? "診断を始められませんでした" : "ホームページが見つかりませんでした")
              : phase === "resolving"
              ? `「${displayInput(rawInput)}」のホームページを探しています`
              : `「${displayInput(rawInput)}」のホームページはどれですか？`}
          </h1>
          {phase === "resolving" ? <div className="scan-resolve-loading" role="status"><span className="scan-resolve-spinner" aria-hidden="true" />探しています…</div> : null}
          {phase === "choose" ? <>
            <fieldset className="scan-resolve-options">
              <legend className="sr-only">ホームページの候補</legend>
              {candidates.map((candidate) => {
                const host = hostOf(candidate.url);
                return <label className={`scan-resolve-option ${selectedUrl === candidate.url ? "selected" : ""}`} key={candidate.url}>
                  <input type="radio" name="scan-candidate" value={candidate.url} checked={selectedUrl === candidate.url} onChange={() => setSelectedUrl(candidate.url)} />
                  <span className="scan-resolve-option-copy"><strong>{candidate.title}</strong><small>{host}</small><span>{candidate.reason}</span></span>
                </label>;
              })}
            </fieldset>
            <div className="scan-resolve-actions">
              <button className="button button-primary scan-resolve-start" type="button" disabled={!selectedUrl} onClick={() => void startScan(selectedUrl)}>このサイトで診断する <span aria-hidden="true">→</span></button>
              <button className="button button-secondary scan-resolve-alt-btn" type="button" onClick={() => setPhase("no_site")}>この中にない・ホームページがない</button>
            </div>
          </> : null}
          {phase === "failed" ? <div className="scan-error" role="alert">
            <p>{isServiceUnavailableError(error) ? "少し時間をおいてお試しください。" : error}</p>
            <div className="scan-error-actions">
              <button className="button button-secondary" type="button" onClick={() => router.push("/")}>入力をやり直す</button>
            </div>
          </div> : null}
        </div>
      </section>
    </main>;
  }

  return <main className="scan-page">
    <SiteHeader compact />
    <ScanSteps current={2} />
    <section className="scan-stage shell">
      <div className="scan-stage-main">
        <p className="overline">診断中</p>
        <h1>{targetHost ? `${targetHost}を確認しています。` : `「${displayInput(rawInput)}」を調べています。`}</h1>
        <p className="scan-message">{message}</p>
        <div className="scan-progress-track" aria-label={`進捗 ${Math.round(progress)}%`}><span style={{ width: `${progress}%` }} /></div>
        <div className="scan-progress-summary"><strong>{Math.round(progress)}%</strong><span>{detail}</span></div>
        {!error ? <button className="scan-cancel" type="button" onClick={() => { controller.current?.abort(); router.push("/"); }}>診断をやめる</button> : null}
        {error ? <div className="scan-error" role="alert">
          <strong>{isServiceUnavailableError(error) ? "いまは診断できません" : "診断を終えられませんでした"}</strong>
          <p>{isServiceUnavailableError(error) ? "少し時間をおいてお試しください。" : error}</p>
          <div className="scan-error-actions">
            <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>もう一度試す</button>
          </div>
        </div> : null}
      </div>
      <div className="scan-stage-list" aria-label="診断の進み具合"><div className="scan-stage-list-head"><strong>進み具合</strong><span>{completedCount} / {steps.length}</span></div><ol>{steps.map((item, index) => {
        const state = stage === "failed" ? (index < activeIndex ? "done" : index === activeIndex ? "failed" : "pending") : index < activeIndex || stage === "complete" ? "done" : index === activeIndex ? "active" : "pending";
        // ホームページなし（名前だけ）の診断では、読むページがないので手順名を変える
        const label = !targetHost && item.stage === "crawling" ? "名前と地域を確認" : item.label;
        return <li className={state} key={item.stage}><span>{state === "done" ? "✓" : state === "failed" ? "!" : index + 1}</span><strong>{label}</strong>{state === "active" ? <em>確認中</em> : state === "done" ? <em>完了</em> : null}</li>;
      })}</ol><p className="scan-stage-note">終わると、結果の画面に進みます。</p></div>
    </section>
  </main>;
}

/** 診断までの3ステップと現在地（「無料で診断」を押した約束と画面をつなぐ） */
function ScanSteps({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["診断先の確認", "AIに聞いて調べる", "結果を見る"];
  return (
    <ol className="scan-steps shell" aria-label="診断の流れ">
      {labels.map((label, index) => {
        const step = index + 1;
        const state = step < current ? "done" : step === current ? "current" : "todo";
        return <li key={label} className={`scan-steps-item is-${state}`} aria-current={state === "current" ? "step" : undefined}><span>{state === "done" ? "✓" : step}</span>{label}{state === "current" ? <em>今ここ</em> : null}</li>;
      })}
    </ol>
  );
}
