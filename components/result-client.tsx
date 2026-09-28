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
import { sampleResult } from "@/lib/sample-data";
import { WATCH_MONTHLY_PRICE_LABEL } from "@/lib/pricing";
import { measurementReadout, readoutIdentity } from "@/lib/measurement-readout";
import type { EvidenceGap, LostPrompt, Observation, ProviderName, ScanRecord, ScanResult } from "@/lib/types";

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

export function ResultClient({ showSellerLinks = false }: { showSellerLinks?: boolean } = {}) {
  const params = useSearchParams();
  const sample = params.get("sample") === "1";
  const scanId = params.get("id");
  return <ResultView key={readoutIdentity(sample, scanId)} sample={sample} scanId={scanId} showSellerLinks={showSellerLinks} />;
}

function ResultView({ sample, scanId, showSellerLinks }: { sample: boolean; scanId: string | null; showSellerLinks: boolean }) {
  const router = useRouter();
  const lifecycle = useRef<AbortController | null>(null);
  const [rawResult, setResult] = useState<ScanResult | null>(sample ? sampleResult : null);
  const [loading, setLoading] = useState(!sample);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [watchBusy, setWatchBusy] = useState(false);

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
  const citationCount = new Set(result.observations.filter((item) => item.status === "success").flatMap((item) => item.citations.map((citation) => citation.url))).size;
  const host = (() => { try { return new URL(result.targetUrl).hostname.replace(/^www\./, ""); } catch { return result.targetUrl; } })();
  const displayWarnings = [...new Set(result.warnings.map(userFacingWarning))];

  return <main className="report-page">
    <SiteHeader compact context={headerContext} />
    <ReportSubbar brandName={result.discovery.brandName} sample={sample} router={router} />

    {/* ① 結論：何問中何問が候補外で、主な競合は誰か */}
    <ReportConclusion
      result={result}
      sample={sample}
      host={host}
      hasMeasurement={hasMeasurement}
      readout={readout}
      topCompetitorName={topCompetitor?.name}
      primaryLoss={primaryLoss}
      primaryWinner={primaryWinner}
      citationCount={citationCount}
    />

    {/* ② どこで負けているか：質問ごとの候補入り状況。詳細は折りたたみ */}
    <ReportQuestions result={result} sample={sample} primaryLoss={primaryLoss} primaryGap={primaryGap} />

    {/* ③ 次にやること：AI推薦データの完成文案 */}
    <div id="step-2" className="report-publish-section">
      <div className="shell">
        <div className="report-publish-head">
          <span className="step-badge">【ステップ 2】今すぐできる解決アクション</span>
          <h2>自社サイト改修ゼロで、AI推薦データを配備</h2>
          <p>会社の強み・対応条件・参照元をまとめた、AI向けの公開データを作成します。自社サイトの改修も、一から文章を作る作業も不要です。内容を確認・承認した後に公開できます。</p>
        </div>
        <PositioningPanel positioning={result.positioning} />
        <div className="report-publish-actions">
          <PublicProfileActions result={result} sample={sample} />
        </div>
      </div>
    </div>

    {/* ④ 週次見守り（14日間無料） */}
    <div id="step-3">
      <section className="report-watch" id="watch-plan">
        <div className="shell report-watch-inner">
          <div>
            <span className="step-badge">【ステップ 3】継続・品質維持</span>
            <p className="overline">週次自動見守りプラン（14日間無料トライアル）</p>
            <h2>AIの推薦状況を、<br />毎週自動で追跡・チェック。</h2>
            <p>同じ質問パネルで、自社の候補入り状況と参照元の変化を記録します。毎回自分でAIに質問して比べる手間を抑え、選ばれる理由の見直しに役立てます。</p>
            <ul>
              <li>{WATCH_MONTHLY_PRICE_LABEL} / 週次の回答測定と差分確認</li>
              <li>月単位で利用でき、管理画面から解約手続きが可能</li>
              <li>最初の14日間は無料確認（開始時に有料化しません）</li>
            </ul>
          </div>
          <form onSubmit={startWatch}>
            <label htmlFor="watch-email">
              AI推薦状況の変化通知メールアドレス <span className="watch-email-optional">（任意・空欄のままでも開始できます）</span>
            </label>
            <input
              id="watch-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="通知を受け取る場合のみ入力（空欄でもOK）"
            />
            <button className="button button-primary" disabled={watchBusy}>
              {watchBusy ? "準備しています…" : "14日間無料で試してみる（メール登録不要）"}
              <ArrowIcon />
            </button>
            <small>※ メール入力は任意です。空欄のままでも週次測定を開始できます。</small>
          </form>
        </div>
      </section>
    </div>

    {/* 注意書きはページ下部に1回だけ */}
    {!sample && displayWarnings.length ? (
      <section className="shell report-footnotes">
        {displayWarnings.map((warning) => <p className="report-warning" key={warning}>{warning}</p>)}
      </section>
    ) : null}

    {error ? <p className="floating-error" role="alert">{error}</p> : null}
    <SiteFooter showSellerLinks={showSellerLinks} />
  </main>;
}

/* ------------------------------------------------------------------ */
/* セクション単位のプレゼンテーション用コンポーネント（result-client専用、外部から再利用しない） */
/* ------------------------------------------------------------------ */

function ReportSubbar({ brandName, sample, router }: { brandName: string; sample: boolean; router: ReturnType<typeof useRouter> }) {
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionQuery, setCorrectionQuery] = useState("");

  return (
    <div className="report-subbar">
      <div className="shell report-subbar-inner">
        <div className="report-subbar-breadcrumb">
          <Link href="/">ホーム</Link>
          <span>/</span>
          <span className="report-subbar-current">AI診断レポート</span>
          <span className="report-subbar-brand">{brandName}</span>
          {sample ? <span className="report-subbar-sample">見本</span> : null}
        </div>

        <nav aria-label="診断ステップ" className="report-subbar-nav">
          <a href="#step-1">① 結論</a>
          <a href="#step-2">② 次にやること</a>
          <a href="#step-3">③ 週次見守り</a>
        </nav>

        <div>
          {!showCorrectionForm ? (
            <button type="button" className="report-subbar-correction-btn" onClick={() => setShowCorrectionForm(true)}>
              ※対象店舗・地域を変更する
            </button>
          ) : (
            <form
              className="report-subbar-correction-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (correctionQuery.trim()) router.push(`/scan?input=${encodeURIComponent(correctionQuery.trim())}`);
              }}
            >
              <input
                type="text"
                name="correctionQuery"
                aria-label="診断対象の会社名・地域またはURL"
                placeholder="例: 青葉ベーカリー 高崎、URL"
                value={correctionQuery}
                onChange={(event) => setCorrectionQuery(event.target.value)}
                autoFocus
              />
              <button type="submit">再診断</button>
              <button type="button" onClick={() => setShowCorrectionForm(false)} aria-label="閉じる">✕</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

type Readout = ReturnType<typeof measurementReadout>;

function ReportConclusion({
  result,
  sample,
  host,
  hasMeasurement,
  readout,
  topCompetitorName,
  primaryLoss,
  primaryWinner,
  citationCount,
}: {
  result: ScanResult;
  sample: boolean;
  host: string;
  hasMeasurement: boolean;
  readout: Readout;
  topCompetitorName?: string;
  primaryLoss?: LostPrompt;
  primaryWinner: string | null;
  citationCount: number;
}) {
  return (
    <div id="step-1">
      <section className="report-header">
        <div className="shell">
          <div className="report-header-top">
            <div>
              <p className="overline">自社専用 AI診断レポート</p>
              <h1>{result.discovery.brandName}</h1>
              <p className="report-host">{host}</p>
            </div>
            <span className="report-date">{sample ? "診断レポートの見本" : `実測日: ${formatDate(result.measuredAt)}`}</span>
          </div>

          <p className="report-headline">
            {hasMeasurement ? (
              <>
                回答を取得した<strong>{readout.successful}問</strong>中、<span><strong>{readout.excluded}問</strong>で自社が候補外でした。</span>
              </>
            ) : (
              "公開ページの情報を確認しました。AI回答の測定は未完了です。"
            )}
          </p>

          <div className="report-meta">
            <span>対象分野: {result.discovery.market}</span>
            <span>測定対象AI: ChatGPT / Perplexity / Gemini</span>
            <span>比較質問: 全{result.panel.promptCount}問</span>
          </div>

          <ReportActions result={result} sample={sample} />
        </div>
      </section>

      <section className="report-summary shell">
        <div className="summary-copy">
          <p className={`overline${primaryLoss ? " summary-urgent-label" : ""}`}>{primaryLoss ? "AI回答の測定結果" : "測定結果"}</p>
          <h2>
            {!hasMeasurement
              ? "AI回答は未取得です。候補入りは未判定です。"
              : primaryLoss
              ? <>AI回答では、<strong>{primaryWinner || "他社候補"}</strong>が先に表示されました。</>
              : "測定した質問で、自社も候補に含まれました。"}
          </h2>
          <p>
            {!hasMeasurement
              ? "AI回答の取得後に候補入り状況を確認できます。"
              : primaryLoss
              ? "この相談でも自社が推薦候補に入ることを目指し、専門分野や対応条件で選ばれる理由を探します。今回の観測だけで候補外の原因や顧客の流出は断定せず、参照元と質問条件を確認します。"
              : "測定した質問では、自社が候補に含まれました。回答は質問・参照元・モデルの更新で変わるため、必要に応じて同じ条件で再測定します。"}
          </p>

          {primaryLoss ? (
            <div className="summary-loss-box">
              <span className="summary-loss-label">他社候補が先に表示された質問の例</span>
              <p className="summary-loss-prompt">「{primaryLoss.prompt}」</p>
              <p className="summary-loss-detail">
                {primaryWinner ? `今回の回答では「${primaryWinner}」が先に候補に含まれました。` : "今回の回答では他社候補が先に含まれました。"}
                {primaryLoss.summary ? ` （判定理由：${primaryLoss.summary}）` : ""}
              </p>
            </div>
          ) : null}
        </div>
        <div>
          <div className="summary-stats">
            <div><span>自社が候補に含まれた質問（AIの回答の過半数で判定）</span><strong>{readout.label}</strong></div>
            <div><span>回答に多く含まれた他社候補</span><strong>{topCompetitorName || "—"}</strong></div>
            <div><span>確認した参照元URL</span><strong>{citationCount}件</strong></div>
            <div><span>週次見守り</span><strong className="summary-unconnected">登録後に毎週測定</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReportQuestions({
  result,
  sample,
  primaryLoss,
  primaryGap,
}: {
  result: ScanResult;
  sample: boolean;
  primaryLoss?: LostPrompt;
  primaryGap?: EvidenceGap;
}) {
  const [openObservation, setOpenObservation] = useState("");

  return (
    <>
      {/* 測定条件（詳細は折りたたみ） */}
      <section className="shell report-measurement-note">
        <details>
          <summary>測定条件と参照元を確認する</summary>
          <div className="report-measurement-grid">
            <div><small>調査対象AI</small><span>ChatGPT / Perplexity / Google Gemini</span></div>
            <div><small>測定母数</small><span>質問{result.panel.promptCount}問 × AI回答（成功{result.successfulObservations}件）</span></div>
            <div><small>調査方法</small><span>{sample ? "サンプルデータを使った表示例" : "各AIに同一条件で質問し、取得できた回答を記録"}</span></div>
            <div><small>判定基準</small><span>回答内で自社が候補に含まれたかを分析</span></div>
          </div>
          <p className="report-measurement-caveat">
            測定日時: {formatDate(result.measuredAt)} JST。候補名は指定したAI回答に含まれた文字列を測定ログとして表示しています。他社の品質・市場全体の順位・顧客の流出を評価するものではありません。公開情報ページには測定ログや他社名を自動掲載しません。
          </p>
        </details>
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
    </>
  );
}
