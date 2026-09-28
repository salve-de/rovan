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
  { stage: "validating", label: "診断先を確認" },
  { stage: "crawling", label: "公開ページを読む" },
  { stage: "discovering", label: "市場と競合を整理" },
  { stage: "prompting", label: "購入前の質問を作る" },
  { stage: "measuring", label: "AI回答を確認" },
  { stage: "analyzing", label: "結果と優先順位をまとめる" },
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

// The scan and resolve APIs return operator-facing messages (e.g. "AI接続を準備中です")
// when a required credential or connection isn't ready yet. Users should see a plain
// "please try again later" message instead of that internal wording.
function isServiceUnavailableError(message: string) {
  return /準備中/.test(message);
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
  const [directDraft, setDirectDraft] = useState<{ profileId: string; token: string; slug: string } | null>(null);

  const createDirectProfile = useCallback(async () => {
    setDirectCreating(true);
    setError("");
    try {
      const finalBrand = (directBrandName || rawInput).trim();
      const summaryParts = [
        `${finalBrand}の公開情報参照ページの下書きです。`,
        extraSocial || socialInfo.isSocial ? "入力されたSNS参照先は、内容を未確認の情報として記録します。" : "",
        extraProduct ? `入力された商品・サービス名: ${extraProduct}。` : "",
        extraUrl ? "入力された参照元URLは未確認です。" : "参照元URLは未指定です。",
        "公開前に内容を確認し、必要な情報だけを掲載してください。"
      ].filter(Boolean).join(" ");

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
      if (!response.ok || !data.slug || !data.profile?.id || !data.token) throw new Error(data.error || "公開ページの下書きを作成できませんでした。");
      setDirectDraft({ profileId: data.profile.id, token: data.token, slug: data.slug });
      setPhase("direct_preview");
      setDirectCreating(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "公開ページの下書きを作成できませんでした。");
      setDirectCreating(false);
    }
  }, [directBrandName, extraProduct, extraSocial, extraUrl, rawInput, socialInfo.originalUrl, socialInfo.isSocial]);

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

  const startScan = useCallback(async (inputUrl: string) => {
    const targetUrl = normalize(inputUrl);
    if (!targetUrl) {
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
      const response = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify({ url: targetUrl }), signal: abort.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
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
      setMessage("Instagram等のSNS連携フロー");
      setDetail("SNS入力を含む公開情報ページの下書きを作成します");
      return () => undefined;
    }
    if (inputKind === "product") {
      setPhase("product_site");
      setMessage("商品・サービスの公開情報ページを準備します");
      setDetail("入力された名称をもとに下書きを作成します");
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
    setMessage("公開サイトを探しています。");
    setDetail("入力名に対応する候補を検索しています");
    async function resolve() {
      try {
        const response = await fetch("/api/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: rawInput }), signal: abort.signal });
        const data = await response.json().catch(() => ({})) as ResolutionPayload;
        if (!response.ok) throw new Error(data.error || `公開サイトを探せませんでした (${response.status})`);
        const nextCandidates = Array.isArray(data.candidates) ? data.candidates.filter((candidate) => candidate?.url) : [];
        if (!nextCandidates.length) {
          setPhase("no_site");
          setMessage("参照できる公開サイトがない場合の下書き作成");
          setDetail("入力された名称から公開情報ページの下書きを作成します");
          return;
        }
        setCandidates(nextCandidates);
        setSelectedUrl(nextCandidates[0].url);
        setPhase("choose");
        setMessage("診断先を確認してください。");
        setDetail(`${nextCandidates.length}件の公開サイト候補`);
      } catch (caught) {
        if (abort.signal.aborted) return;
        setPhase("failed");
        setError(caught instanceof Error ? caught.message : "公開サイトを探せませんでした。");
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
      ? (socialInfo.displayLabel || "Instagram連携")
      : isProduct
      ? "商品・サービス"
      : isDirectPreview
      ? "公開前の確認"
      : "参照元サイト未指定";

    const titleText = isSocial
      ? `Instagram「${displayInput(rawInput)}」の公開情報ページを確認`
      : isProduct
      ? `商品「${displayInput(rawInput)}」の公開情報ページを確認`
      : isDirectPreview
      ? `「${displayInput(directBrandName || rawInput)}」の公開前確認`
      : `「${displayInput(rawInput)}」の公開情報ページを下書き作成`;

    const descText = isSocial
      ? "入力されたSNS情報をもとに、公開情報ページの下書きを作成します。SNSの投稿内容を自動で事実として転載せず、公開する内容は確認後に決められます。"
      : isProduct
      ? "入力された商品・サービス名をもとに、公開情報ページの下書きを作成します。用途・価格・実績など、入力や参照元で確認できない内容は補いません。"
      : isDirectPreview
      ? "下書きの内容を確認してから公開できます。公開後も、AIの回答・推薦・順位や集客成果は保証されません。"
      : "参照元サイトが見つからない場合も、入力された名称だけで公開情報ページの下書きを作成できます。内容は公開前に確認してください。";

    const brandLabel = isSocial
      ? "店舗名・屋号・ブランド名"
      : isProduct
      ? "商品名・サービス名（ブランド名）"
      : "会社名・屋号（表示名）";

    const buttonText = isDirectPreview ? "内容を確認して公開する" : "公開情報ページの下書きを作成する";

    const noteText = isSocial
      ? "※公開する情報は事実確認後に決めてください。RovanはAIの回答・推薦・順位や成果を保証しません。"
      : isProduct
      ? "※価格・仕様・実績などの記載がない事項は補いません。公開後の内容変更は、参照元と確認状況を見直して行います。"
      : "※これは公開情報を整理するためのページです。公式性・推薦結果・集客効果を保証するものではありません。";

    return (
      <main className="scan-page">
        <SiteHeader compact />
        <section className="direct-entry-stage shell">
          <div className="no-site-card">
            <div className="no-site-tag-row">
              <span className={`no-site-tag${isSocial ? " no-site-tag--social" : isProduct ? " no-site-tag--product" : ""}`}>
                {badgeText}
              </span>
            </div>
            <h1>{titleText}</h1>
            <p className="no-site-desc">{descText}</p>

            <div className="no-site-form-grid no-site-form-grid--single">
              <div className="no-site-input-group">
                <span>{isDirectPreview ? "公開する名称" : brandLabel}</span>
                <p className="input-readonly">{directBrandName || rawInput}</p>
              </div>
              {isDirectPreview ? (
                <div className="no-site-input-group">
                  <span>下書きに含める情報</span>
                  <p className="no-site-input-note">入力された名称{extraSocial || socialInfo.isSocial ? "・SNS参照先" : ""}{extraProduct ? "・商品／サービス名" : ""}{extraUrl ? "・参照元URL" : ""}。未確認の業種・所在地・価格・実績は追加していません。</p>
                </div>
              ) : null}
            </div>

            <div className="no-site-action-row">
              <div className="no-site-target-brand">
                <span>登録対象：</span>
                <strong>{socialInfo.displayLabel || directBrandName || rawInput}</strong>
              </div>
              <button
                className="button button-primary scan-resolve-start"
                type="button"
                disabled={directCreating}
                onClick={() => void (isDirectPreview ? publishDirectProfile() : createDirectProfile())}
              >
                {directCreating ? (isDirectPreview ? "公開処理中…" : "下書きを作成中…") : buttonText} <ArrowIcon />
              </button>
            </div>
            {directDraft ? <ProfileManagementLink capability={{ profileId: directDraft.profileId, token: directDraft.token }} /> : null}
            {error ? <p className="form-error no-site-error">{error}</p> : null}
            <small className="no-site-small-note">{noteText}</small>
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
          <p className="overline">
            {phase === "failed" ? "診断を開始できませんでした" : phase === "resolving" ? "診断先を検索中" : "診断先の確認"}
          </p>
          <h1>
            {phase === "failed"
              ? (isServiceUnavailableError(error) ? "現在診断を受け付けられません。" : isDirectTarget ? "診断を開始できませんでした。" : "公開サイトを見つけられませんでした。")
              : phase === "resolving"
              ? `「${displayInput(rawInput)}」の公開サイトを探しています。`
              : `「${displayInput(rawInput)}」の公開サイトを確認してください`}
          </h1>
          {phase !== "failed" ? <p className="scan-message">
            {phase === "resolving"
              ? "会社名・商品名から、診断できる公開サイトを調べています。"
              : "AIが同名の別会社と取り違えないよう、ドメインとページ内容を確認して診断先を確定します。"}
          </p> : null}
          {phase === "resolving" ? <div className="scan-resolve-loading" role="status"><span className="scan-resolve-spinner" aria-hidden="true" />公開情報を検索しています…</div> : null}
          {phase === "choose" ? <>
            <div className="disambiguation-guide-box">
              <span className="disambiguation-tag">同名他社・人違い防止確認</span>
              <p>
                「{displayInput(rawInput)}」に該当する公開候補が見つかりました。AIが別の会社と誤認しないよう、<strong>ご自身の会社・店舗・サービスのサイト</strong>を選択してください。
              </p>
            </div>
            <fieldset className="scan-resolve-options">
              <legend>診断する公開サイト（目視で確定）</legend>
              {candidates.map((candidate) => {
                const host = hostOf(candidate.url);
                return <label className={`scan-resolve-option ${selectedUrl === candidate.url ? "selected" : ""}`} key={candidate.url}>
                  <input type="radio" name="scan-candidate" value={candidate.url} checked={selectedUrl === candidate.url} onChange={() => setSelectedUrl(candidate.url)} />
                  <span className="scan-resolve-option-copy"><strong>{candidate.title}</strong><small>{host}</small><span>{candidate.reason}</span></span>
                </label>;
              })}
            </fieldset>
            <div className="scan-resolve-actions">
              <button className="button button-primary scan-resolve-start" type="button" disabled={!selectedUrl} onClick={() => void startScan(selectedUrl)}>このサイトを確定して診断する <span aria-hidden="true">→</span></button>
              <button className="button button-secondary scan-resolve-alt-btn" type="button" onClick={() => setPhase("no_site")}>自社サイトがない・候補にない（直接発行する）</button>
            </div>
            <p className="scan-resolve-note">※ドメインとサイト内容を確認してから確定するため、同名他社との取り違えを避けやすくなります。</p>
          </> : null}
          {phase === "failed" ? <div className="scan-error" role="alert">
            <p>{isServiceUnavailableError(error) ? "時間を置いてもう一度お試しください。" : error}</p>
            <div className="scan-error-actions">
              <button className="button button-secondary" type="button" onClick={() => router.push("/")}>入力をやり直す</button>
            </div>
          </div> : null}
        </div>
        {phase === "choose" || phase === "resolving" ? (
          <aside className="scan-stage-list scan-resolve-aside">
            <div className="scan-stage-list-head">
              <strong>入力できるもの</strong>
              <span>URL / 名前</span>
            </div>
            <ul className="scan-input-types">
              <li><strong>会社名</strong><span>例：株式会社○○</span></li>
              <li><strong>サービス名・商品名</strong><span>例：Notion、○○クラウド</span></li>
              <li><strong>公開サイトのURL</strong><span>例：https://yourcompany.jp</span></li>
            </ul>
            <p className="scan-stage-note">名前で探した場合も、公開サイトを選んでから診断します。</p>
          </aside>
        ) : null}
      </section>
    </main>;
  }

  return <main className="scan-page">
    <SiteHeader compact />
    <section className="scan-stage shell">
      <div className="scan-stage-main">
        <p className="overline">診断中</p>
        <h1>{targetHost || "会社サイト"}を確認しています。</h1>
        <p className="scan-message">{message}</p>
        <div className="scan-progress-track" aria-label={`進捗 ${Math.round(progress)}%`}><span style={{ width: `${progress}%` }} /></div>
        <div className="scan-progress-summary"><strong>{Math.round(progress)}%</strong><span>{detail}</span></div>
        {!error ? <button className="scan-cancel" type="button" onClick={() => { controller.current?.abort(); router.push("/"); }}>診断をやめる</button> : null}
        {error ? <div className="scan-error" role="alert">
          <strong>{isServiceUnavailableError(error) ? "現在診断を受け付けられません。" : "診断を完了できませんでした。"}</strong>
          <p>{isServiceUnavailableError(error) ? "時間を置いてもう一度お試しください。" : error}</p>
          <div className="scan-error-actions">
            <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>もう一度試す</button>
          </div>
        </div> : null}
      </div>
      <div className="scan-stage-list" aria-label="診断の進み具合"><div className="scan-stage-list-head"><strong>今回確認すること</strong><span>{completedCount} / {steps.length}</span></div><ol>{steps.map((item, index) => {
        const state = stage === "failed" ? (index < activeIndex ? "done" : index === activeIndex ? "failed" : "pending") : index < activeIndex || stage === "complete" ? "done" : index === activeIndex ? "active" : "pending";
        return <li className={state} key={item.stage}><span>{state === "done" ? "✓" : state === "failed" ? "!" : index + 1}</span><strong>{item.label}</strong>{state === "active" ? <em>確認中</em> : state === "done" ? <em>完了</em> : null}</li>;
      })}</ol><p className="scan-stage-note">サイトの内容とAIの回答を順番に照合しています。完了すると結果ページへ移動します。</p></div>
    </section>
  </main>;
}
