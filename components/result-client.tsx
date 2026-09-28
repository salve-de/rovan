"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ArrowIcon, QuoteIcon } from "@/components/icons";
import { CitationMap } from "@/components/citation-map";
import { QuestionList } from "@/components/question-list";
import { ReportActions } from "@/components/report-actions";
import { PositioningPanel } from "@/components/positioning-panel";
import { PublicProfileActions } from "@/components/public-profile-actions";
import { ExecutiveDiagnosticSummary } from "@/components/executive-diagnostic-summary";
import { sampleResult } from "@/lib/sample-data";
import { WATCH_MONTHLY_PRICE_LABEL } from "@/lib/pricing";
import { measurementReadout, readoutIdentity } from "@/lib/measurement-readout";
import type { Observation, ProviderName, ScanRecord, ScanResult } from "@/lib/types";

function providerLabel(provider: ProviderName) {
  return provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : "Perplexity";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

function userFacingWarning(value: string) {
  if (value.includes("市場認識") || value.includes("市場の信頼")) return "会社や市場の情報が少ないため、競合との比較は参考値です。";
  if (value.includes("Recommendation") || value.includes("観測が失敗") || value.includes("観測が未設定")) return "一部のAI回答を取得できなかったため、取得できた回答だけで結果を表示しています。";
  if (value.includes("AI Provider") || value.includes("有効な回答がありません")) return "AIの回答を取得できなかったため、今回の比較結果は表示できません。時間を置いてもう一度お試しください。";
  if (value.includes("競合候補")) return "比較できる会社を十分に見つけられませんでした。市場を確認してからもう一度お試しください。";
  return value;
}



export function ResultClient() {
  const params = useSearchParams();
  const sample = params.get("sample") === "1";
  const scanId = params.get("id");
  return <ResultView key={readoutIdentity(sample, scanId)} sample={sample} scanId={scanId} />;
}

function ResultView({ sample, scanId }: { sample: boolean; scanId: string | null }) {
  const router = useRouter();
  const lifecycle = useRef<AbortController | null>(null);
  const [rawResult, setResult] = useState<ScanResult | null>(sample ? sampleResult : null);
  const [loading, setLoading] = useState(!sample);
  const [error, setError] = useState("");
  const [openObservation, setOpenObservation] = useState("");
  const [email, setEmail] = useState("");
  const [watchBusy, setWatchBusy] = useState(false);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionQuery, setCorrectionQuery] = useState("");

  const result = rawResult;
  const resultHref = `/result?id=${encodeURIComponent(scanId || "")}`;
  const headerContext = !sample && scanId ? { resultHref, profileHref: `${resultHref}#step-2`, watchHref: `${resultHref}#step-3` } : undefined;

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    if (sample) return () => controller.abort();
    if (!scanId) { setError("開いたリンクに診断結果の情報が含まれていません。"); setLoading(false); return () => controller.abort(); }
    fetch(`/api/scans/${encodeURIComponent(scanId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as ScanRecord & { error?: string };
        if (!response.ok) throw new Error(data.error || "診断結果を取得できませんでした。");
        if (!data.result) throw new Error(data.error || "診断はまだ完了していません。");
        if (!controller.signal.aborted) setResult(data.result);
      })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "結果を取得できませんでした。"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sample, scanId]);

  async function startWatch(event: FormEvent) {
    event.preventDefault();
    if (sample) { router.push("/watch?sample=1"); return; }
    if (!scanId) return;
    const signal = lifecycle.current!.signal;
    setWatchBusy(true); setError("");
    try {
      const response = await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scanId, email }), signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "改善後の確認を開始できませんでした。");
      if (!signal.aborted) router.push(`/watch?token=${encodeURIComponent(data.token)}`);
    } catch (caught) { if (!signal.aborted) setError(caught instanceof Error ? caught.message : "改善後の確認を開始できませんでした。"); }
    finally { if (!signal.aborted) setWatchBusy(false); }
  }

  if (loading) return <div className="full-loading">診断結果を読み込んでいます。</div>;
  if (!result) return <main className="empty-page"><SiteHeader compact /><div className="shell empty-content"><h1>診断結果を表示できません。</h1><p>{error}</p><p><Link className="button button-primary" href="/">新しく無料診断する</Link> <Link className="button" href="/manage">過去の結果を開く</Link></p></div></main>;

  const topCompetitor = result.competitors[0];
  const primaryLoss = result.lostPrompts[0];
  const primaryGap = result.evidenceGaps[0];
  const readout = measurementReadout(result);
  const hasMeasurement = readout.successful > 0;
  const primaryWinner = primaryLoss?.winner || topCompetitor?.name || null;
  const citationCount = new Set(result.observations.filter(item => item.status === "success").flatMap(item => item.citations.map(citation => citation.url))).size;
  const host = (() => { try { return new URL(result.targetUrl).hostname.replace(/^www\./, ""); } catch { return result.targetUrl; } })();
  const displayWarnings = [...new Set(result.warnings.map(userFacingWarning))];



  return <main className="report-page">
    <SiteHeader compact context={headerContext} />

    {/* 極細スマートサブバー（多重帯を完全統合・ファーストビューを開放） */}
    <div className="report-subbar" style={{ background: "var(--bg-base, #ffffff)", borderBottom: "1px solid var(--border-subtle, #e2e8f0)", padding: "10px 0" }}>
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", fontSize: "0.8rem" }}>
        {/* 左：パンくず */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted, #64748b)" }}>
          <Link href="/" style={{ color: "var(--text-muted, #64748b)", textDecoration: "none" }}>ホーム</Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary, #0f172a)", fontWeight: 700 }}>AI診断レポート</span>
          <span style={{ background: "var(--bg-surface, #f1f5f9)", color: "var(--text-secondary, #475569)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", border: "1px solid var(--border-subtle, #e2e8f0)" }}>
            {result.discovery.brandName}
          </span>
            {sample ? <span style={{ fontSize: "0.72rem", color: "var(--accent-blue, #0284c7)", background: "#e0f2fe", padding: "1px 6px", borderRadius: "3px", fontWeight: 600 }}>見本</span> : null}
        </div>

        {/* 中央：スリムな3ステップ・ナビゲーション */}
        <nav aria-label="診断ステップ" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <a href="#step-1" style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none", padding: "4px 10px", borderRadius: "20px", background: "var(--navy, #0f172a)", color: "#ffffff", fontSize: "0.74rem", fontWeight: 700 }}>
            <span>① 現状を知る</span>
          </a>
          <a href="#step-2" style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none", padding: "4px 10px", borderRadius: "20px", background: "var(--bg-surface, #f1f5f9)", color: "var(--text-secondary, #475569)", fontSize: "0.74rem", fontWeight: 600, border: "1px solid var(--border-subtle, #e2e8f0)" }}>
            <span>② AI推薦データを配備</span>
          </a>
          <a href="#step-3" style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none", padding: "4px 10px", borderRadius: "20px", background: "var(--bg-surface, #f1f5f9)", color: "var(--text-secondary, #475569)", fontSize: "0.74rem", fontWeight: 600, border: "1px solid var(--border-subtle, #e2e8f0)" }}>
            <span>③ 推移を追跡</span>
          </a>
        </nav>

        {/* 右：対象店舗の再指定リンク */}
        <div>
          {!showCorrectionForm ? (
            <button
              type="button"
              onClick={() => setShowCorrectionForm(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #64748b)",
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: "4px 8px",
                textDecoration: "underline",
              }}
            >
              ※対象店舗・地域を変更する
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (correctionQuery.trim()) {
                  router.push(`/scan?input=${encodeURIComponent(correctionQuery.trim())}`);
                }
              }}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <input
                type="text"
                name="correctionQuery"
                aria-label="診断対象の会社名・地域またはURL"
                placeholder="例: 青葉ベーカリー 高崎、URL"
                value={correctionQuery}
                onChange={(e) => setCorrectionQuery(e.target.value)}
                style={{ padding: "4px 8px", fontSize: "0.78rem", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#ffffff", outline: "none" }}
                autoFocus
              />
              <button
                type="submit"
                style={{ background: "var(--navy, #0f172a)", color: "#ffffff", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}
              >
                再診断
              </button>
              <button
                type="button"
                onClick={() => setShowCorrectionForm(false)}
                style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.74rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </form>
          )}
        </div>
      </div>
    </div>

    {/* ========================================================= */}
    {/* 【ステップ 1：現状を知る（AI診断カルテ）】 */}
    {/* ========================================================= */}
    <div id="step-1">
      <section className="report-header" style={{ padding: "40px 0 36px" }}>
        <div className="shell">
          <div className="report-header-top">
            <div>
              <p className="overline" style={{ color: "var(--text-muted, #64748b)", fontSize: "0.76rem", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                自社専用 AI診断レポート
              </p>
              <h1 style={{ fontSize: "clamp(1.65rem, 2.8vw, 2.2rem)", fontWeight: 800, color: "var(--navy, #0f172a)", margin: "0 0 6px", letterSpacing: "-0.025em" }}>
                {result.discovery.brandName}
              </h1>
              <p className="report-host" style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted, #64748b)", fontFamily: "var(--font-mono, monospace)" }}>
                {host}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="report-date" style={{ fontSize: "0.74rem", color: "var(--text-muted, #64748b)", background: "#ffffff", border: "1px solid var(--border-subtle, #e2e8f0)", padding: "4px 10px", borderRadius: "4px" }}>
                {sample ? "診断レポートの見本" : `実測日: ${formatDate(result.measuredAt)}`}
              </span>
            </div>
          </div>

          <div className="report-headline" style={{ margin: "24px 0 18px", fontSize: "clamp(1.25rem, 2.2vw, 1.65rem)", fontWeight: 700, color: "var(--navy, #0f172a)", lineHeight: 1.4, letterSpacing: "-0.02em" }}>
            {hasMeasurement ? (
              <>
                回答を取得した<strong>{readout.successful}問</strong>中、
                <span style={{ color: "var(--navy, #0f172a)" }}>
                  <strong>{readout.excluded}問</strong>で自社が候補外でした。
                </span>
              </>
            ) : (
              <>
                公開ページの情報を確認しました。AI回答の測定は未完了です。
              </>
            )}
          </div>

          <div className="report-meta" style={{ display: "flex", flexWrap: "wrap", gap: "12px 18px", color: "var(--text-secondary, #475569)", fontSize: "0.78rem" }}>
            <span>対象分野: {result.discovery.market}</span>
            <span>測定対象AI: ChatGPT / Perplexity / Gemini</span>
            <span>比較質問: 全{result.panel.promptCount}問</span>
          </div>

          <div style={{ marginTop: "18px" }}>
            <ReportActions result={result} sample={sample} />
          </div>

          {!sample ? displayWarnings.map((warning) => <p className="report-warning" key={warning}>{warning}</p>) : null}
        </div>
      </section>

      {/* 現状の診断サマリー */}
      <section className="report-summary shell">
        <div className="summary-copy">
          <p className={`overline ${primaryLoss ? "summary-urgent-label" : ""}`}>{primaryLoss ? "AI回答の測定結果" : "測定結果"}</p>
          <h2>{!hasMeasurement ? "AI回答は未取得です。候補入りは未判定です。" : primaryLoss ? <>AI回答では、<strong>{primaryWinner || "他社候補"}</strong>が<br />先に表示されました。</> : "測定した質問で、自社も候補に含まれました。"}</h2>
          <p>
            {!hasMeasurement ? "AI回答の取得後に候補入り状況を確認できます。" : primaryLoss
              ? "この相談でも自社が推薦候補に入ることを目指し、専門分野や対応条件で選ばれる理由を探します。今回の観測だけで候補外の原因や顧客の流出は断定せず、参照元と質問条件を確認します。"
              : "測定した質問では、自社が候補に含まれました。回答は質問・参照元・モデルの更新で変わるため、必要に応じて同じ条件で再測定します。"}
          </p>

          {primaryLoss ? (
            <div className="summary-loss-box shadow-ambient-sm" style={{ background: "var(--bg-surface, #f8fafc)", padding: "18px 22px", borderRadius: "10px", margin: "18px 0", border: "1px solid var(--border-subtle, #e2e8f0)", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--amber, #d97706)", display: "block", marginBottom: "6px" }}>他社候補が先に表示された質問の例</span>
              <p style={{ margin: "0 0 8px", fontSize: "0.95rem", fontWeight: 700, color: "var(--navy, #0f172a)" }}>「{primaryLoss.prompt}」</p>
              <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-secondary, #475569)", lineHeight: 1.6 }}>
                {primaryWinner ? `今回の回答では「${primaryWinner}」が先に候補に含まれました。` : "今回の回答では他社候補が先に含まれました。"}
                {primaryLoss.summary ? ` （判定理由：${primaryLoss.summary}）` : ""}
              </p>
            </div>
          ) : null}
        </div>
        <div>
          <div className="summary-stats">
            <div><span>自社が候補に含まれた質問（AIの回答の過半数で判定）</span><strong>{readout.label}</strong></div>
            <div><span>回答に多く含まれた他社候補</span><strong>{topCompetitor?.name || "—"}</strong></div>
            <div><span>確認した参照元URL</span><strong>{citationCount}件</strong></div>
            <div><span>週次見守り</span><strong className="summary-unconnected">登録後に毎週測定</strong></div>
          </div>
        </div>
      </section>

      {/* 測定結果の要約と、次の確認方法 */}
      <ExecutiveDiagnosticSummary
        brandName={result.discovery.brandName}
        topCompetitor={topCompetitor?.name}
        lostCount={readout.excluded}
        totalCount={readout.successful}
        scheduledCount={result.panel.promptCount}
        partial={!readout.complete}
      />

      {/* AI測定条件・参照元の説明 */}
      <section className="shell" style={{ marginTop: "20px", marginBottom: "28px" }}>
        <div className="shadow-ambient-sm" style={{ background: "var(--bg-base, #ffffff)", border: "1px solid var(--border-subtle, #e2e8f0)", borderRadius: "10px", padding: "18px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "var(--bg-surface, #f1f5f9)", color: "var(--text-primary, #0f172a)", border: "1px solid var(--border-subtle, #e2e8f0)", padding: "2px 8px", borderRadius: "4px" }}>
                AI回答の測定ログ
              </span>
              <strong style={{ fontSize: "0.86rem", color: "var(--text-primary, #0f172a)" }}>
                測定条件と参照元
              </strong>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)" }}>
              {sample ? "表示用の基準日時" : "測定日時"}: {formatDate(result.measuredAt)} JST · 判定完了
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", fontSize: "0.78rem", color: "var(--text-secondary, #334155)", background: "var(--bg-surface, #f8fafc)", border: "1px solid var(--border-subtle, #e2e8f0)", padding: "12px 16px", borderRadius: "8px" }}>
            <div><strong>調査対象AI:</strong> ChatGPT / Perplexity / Google Gemini</div>
              <div><strong>測定母数:</strong> 質問 {result.panel.promptCount}問 × AI回答（成功 {result.successfulObservations}件）</div>
            <div><strong>調査方法:</strong> {sample ? "サンプルデータを使った表示例" : "各AIに同一条件で質問し、取得できた回答を記録"}</div>
              <div><strong>判定基準:</strong> 回答内で自社が候補に含まれたかを分析</div>
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.72rem", color: "var(--text-muted, #64748b)", lineHeight: 1.6, borderTop: "1px dashed var(--border-subtle, #e2e8f0)", paddingTop: "8px" }}>
            <strong>【観測結果の扱い】</strong>
            本レポートの候補名は、指定したAI回答に含まれた文字列を測定ログとして表示しています。他社の品質・市場全体の順位・顧客の流出を評価するものではありません。公開情報ページには測定ログや他社名を自動掲載しません。
          </div>
        </div>
      </section>

      {/* 買い手がAIに聞く質問一覧 */}
      <section className="report-section shell">
        <div className="section-heading-simple">
          <p className="overline">買い手がAIに聞く質問</p>
          <h2>どの比較で、ライバルが推薦されているか。</h2>
          <p>質問ごとの候補入り状況から、御社の専門性を伝えるべき場面を探します。未確認の対応分野を強みとして断定するものではありません。</p>
        </div>
        <QuestionList result={result} />
      </section>

      {/* 回答に含まれた候補の比較グラフ */}
      <section className="report-section report-compare">
        <div className="shell">
          <div className="section-heading-simple">
            <p className="overline">回答に含まれた候補</p>
            <h2>回答に含まれた候補の件数を比べる。</h2>
            <p>今回取得できたAI回答で、候補として抽出された回数を比較しています。顧客数や市場シェアではありません。</p>
          </div>
          <div className="compare-table">
            <div className="compare-table-head"><span>会社・商品名</span><span>選ばれた回答</span><span>割合</span></div>
            {result.competitors.slice(0, 6).map((competitor, index) => (
              <div className="compare-row" key={competitor.name}>
                <strong><i>{index + 1}</i>{competitor.name}</strong>
                <div className="compare-bar"><span style={{ width: `${Math.max(3, competitor.coverage)}%` }} /></div>
                <b>{competitor.recommendedCount} / {result.successfulObservations}</b>
              </div>
            ))}
            <div className="compare-row compare-own">
              <strong><i>対象</i>{result.discovery.brandName}</strong>
              <div className="compare-bar"><span style={{ width: `${Math.max(3, result.recommendationCoverage)}%` }} /></div>
              <b>{result.ownRecommendationCount} / {result.successfulObservations}</b>
            </div>
          </div>
        </div>
      </section>

      {/* 診断詳細：直すべきポイントと引用元証拠 */}
      <section className="report-section shell report-evidence">
        <div className="section-heading-simple">
          <p className="overline">公開情報の確認ポイント</p>
          <h2>参照元で確認したい情報。</h2>
          <p>今回の質問で確認しにくかった項目を、公開できる事実と参照元に分けて整理しました。掲載や効果は保証しません。</p>
        </div>
        <div className="evidence-layout">
          <div className="evidence-main">
            <h3>{primaryGap?.label || "選ぶ前に確認したい情報"}</h3>
            <p>{primaryGap?.whyItMatters || "この情報が参照元に記載されているか、未確認かを分けて表示します。"}</p>
            {primaryGap?.competitorEvidence ? <p className="evidence-competitor">回答に含まれた参照情報: {primaryGap.competitorEvidence}</p> : null}
          </div>
          <div className="citation-box">
            <h3>AIが参考にしたページ</h3>
            {primaryLoss?.citations.length ? (
              <ul>
                {primaryLoss.citations.slice(0, 5).map((citation) => (
                  <li key={citation.url}>
                    <a href={citation.url} target="_blank" rel="noreferrer"><QuoteIcon />{citation.title || citation.domain}<span>↗</span></a>
                  </li>
                ))}
              </ul>
            ) : <p>引用元ページはありません。</p>}
          </div>
        </div>
        <CitationMap result={result} />
      </section>

      {/* AI回答履歴（アコーディオン） */}
      {primaryLoss ? (
        <section className="report-section shell report-details">
          <details>
            <summary>AIの回答履歴と詳しい判定理由を確認する</summary>
            <div className="observation-list">
              {primaryLoss.observations.map((observation: Observation) => (
                <article key={observation.id}>
                  <button type="button" onClick={() => setOpenObservation(openObservation === observation.id ? "" : observation.id)} aria-expanded={openObservation === observation.id}>
                    <span>{providerLabel(observation.provider)}</span>
                    <strong>{observation.ownPosition ? `自社 ${observation.ownPosition}番目` : "自社は候補外"}</strong>
                    <em>回答 {observation.repetition}</em>
                    <ArrowIcon />
                  </button>
                  {openObservation === observation.id ? (
                    <div className="observation-body">
                      {observation.rawText ? <p>{observation.rawText}</p> : <p className="observation-safe-note">引用元情報のみ表示しています。</p>}
                      {observation.citations.length ? (
                        <ul>
                          {observation.citations.map((citation) => (
                            <li key={citation.url}><a href={citation.url} target="_blank" rel="noreferrer">{citation.title || citation.domain}</a></li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </details>
        </section>
      ) : null}
    </div>

    {/* ========================================================= */}
    {/* 【ステップ 2：公開情報の整理】 */}
    {/* ========================================================= */}
    <div id="step-2" style={{ background: "var(--bg-surface, #f8fafc)", padding: "48px 0", borderTop: "1px solid var(--border-subtle, #e2e8f0)", borderBottom: "1px solid var(--border-subtle, #e2e8f0)", margin: "40px 0" }}>
      <div className="shell">
        <div style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto 36px" }}>
          <span className="step-badge">【ステップ 2】今すぐできる解決アクション</span>
          <h2 style={{ fontSize: "1.8rem", margin: "12px 0 8px", color: "var(--text-primary, #0f172a)", fontWeight: 800 }}>
            自社サイト改修ゼロで、AI推薦データを配備
          </h2>
          <p style={{ color: "var(--text-secondary, #475569)", lineHeight: 1.75 }}>
            会社の強み・対応条件・参照元をまとめた、AI向けの公開データを作成します。自社サイトの改修も、一から文章を作る作業も不要です。内容を確認・承認した後に公開でき、AIの回答・推薦・順位は保証しません。
          </p>
        </div>

        {/* 公開情報の整理案 */}
        <PositioningPanel positioning={result.positioning} />

        {/* 公開情報ページの下書き・確認カード */}
        <div style={{ marginTop: "24px" }}>
          <PublicProfileActions result={result} sample={sample} />
        </div>
      </div>
    </div>

    {/* ========================================================= */}
    {/* 【ステップ 3：推移を追跡する（週次測定）】 */}
    {/* ========================================================= */}
    <div id="step-3">
      <section className="report-watch" id="watch-plan">
        <div className="shell report-watch-inner">
          <div>
            <span className="step-badge" style={{ marginBottom: "8px", display: "inline-block" }}>【ステップ 3】継続・品質維持</span>
            <p className="overline">週次自動見守りプラン（14日間無料トライアル）</p>
            <h2>AIの推薦状況を、<br />毎週自動で追跡・チェック。</h2>
            <p>同じ質問パネルで、自社の候補入り状況と参照元の変化を記録します。毎回自分でAIに質問して比べる手間を抑え、選ばれる理由の見直しに役立てます。</p>
            <ul style={{ margin: "16px 0", paddingLeft: "20px" }}>
              <li style={{ marginBottom: "6px" }}>{WATCH_MONTHLY_PRICE_LABEL} / 週次の回答測定と差分確認</li>
              <li style={{ marginBottom: "6px" }}>月単位で利用でき、管理画面から解約手続きが可能</li>
              <li style={{ marginBottom: "6px" }}>最初の14日間は無料確認（開始時に有料化しません）</li>
            </ul>
          </div>
          <form onSubmit={startWatch}>
            <label htmlFor="watch-email">
              AI推薦状況の変化通知メールアドレス <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#64748b" }}>（任意・空欄のままでも開始できます）</span>
            </label>
            <input
              id="watch-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="通知を受け取る場合のみ入力（空欄でもOK）"
            />
            <button className="button button-primary" disabled={watchBusy} style={{ minHeight: "48px", borderRadius: "var(--radius-btn, 6px)" }}>
              {watchBusy ? "準備しています…" : "14日間無料で試してみる（メール登録不要）"}
              <ArrowIcon />
            </button>
            <small>※ メール入力は任意です。空欄のままでも週次測定を開始できます。</small>
          </form>
        </div>
      </section>

    </div>

    {error ? <p className="floating-error" role="alert">{error}</p> : null}
    <SiteFooter />
  </main>;
}
