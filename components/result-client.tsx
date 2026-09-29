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
import { isNoSiteTarget } from "@/lib/no-site";
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
  const demo = sample && params.get("demo") === "1";
  return <ResultView key={readoutIdentity(sample, scanId)} sample={sample} scanId={scanId} showSellerLinks={showSellerLinks} demo={demo} />;
}

function ResultView({ sample, scanId, showSellerLinks, demo = false }: { sample: boolean; scanId: string | null; showSellerLinks: boolean; demo?: boolean }) {
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
    if (sample) { router.push(demo ? "/watch?sample=1&demo=1" : "/watch?sample=1"); return; }
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

  if (loading) return <div className="full-loading" role="status">診断結果を読み込んでいます。</div>;
  if (!result) return <main className="empty-page"><SiteHeader compact /><div className="shell empty-content"><h1>診断結果を開けませんでした。</h1><p>{error}</p><div className="empty-actions"><Link className="button button-primary" href="/">新しく無料診断する</Link><Link className="button button-secondary" href="/manage">過去の結果を開く</Link></div></div></main>;

  const topCompetitor = result.competitors[0];
  const primaryLoss = result.lostPrompts[0];
  const primaryGap = result.evidenceGaps[0];
  const readout = measurementReadout(result);
  const hasMeasurement = readout.successful > 0;
  const primaryWinner = primaryLoss?.winner || topCompetitor?.name || null;
  const citationCount = new Set(result.observations.filter((item) => item.status === "success").flatMap((item) => item.citations.map((citation) => citation.url))).size;
  const host = isNoSiteTarget(result.targetUrl) ? "ホームページなし（お店の名前で調査）" : (() => { try { return new URL(result.targetUrl).hostname.replace(/^www\./, ""); } catch { return result.targetUrl; } })();
  const displayWarnings = [...new Set(result.warnings.map(userFacingWarning))];

  return <main className="report-page">
    <SiteHeader compact context={headerContext} />
    <ReportSubbar brandName={result.discovery.brandName} sample={sample} router={router} />
    {demo ? (
      <div className="rp-demo-banner" role="status">
        <div className="shell"><strong>デモ表示です。</strong>AIの接続前のため、見本のお店（{result.discovery.brandName}）の結果で流れを見せています。あなたの会社の結果ではありません。</div>
      </div>
    ) : result.demo ? (
      <div className="rp-demo-banner" role="status">
        <div className="shell"><strong>デモ表示です。</strong>AIにまだ接続していないため、AIの答えは入力内容に合わせてつくった模擬データです。比べている相手の会社名も架空です。</div>
      </div>
    ) : null}

    {/* ① 結論 → ② 御社は何番目か → ③ どの質問で負けているか（ホームの「無料の診断で分かる3つ」と同じ順） */}
    <ReportHero result={result} sample={sample} host={host} hasMeasurement={hasMeasurement} readout={readout} topCompetitorName={topCompetitor?.name} />
    <ReportRanking result={result} />
    <ReportLosses result={result} primaryLoss={primaryLoss} primaryWinner={primaryWinner} />

    {/* ③ 次にやること：AI推薦データの完成文案 */}
    <div id="step-2" className="report-publish-section rp-section rp-section--white">
      <div className="shell">
        <div className="rp-head">
          <span className="rp-eyebrow">3. 何をすれば、名前が出る？ ─ 今すぐできる解決アクション</span>
          <h2>御社の強みを、AIが読めるページにします。</h2>
          <p>大手が言っていない御社の強みを、出典つきでまとめました。御社のサイトは書きかえません。内容を確認してから公開できます。</p>
        </div>
        <div className="report-publish-actions">
          <PublicProfileActions result={result} sample={sample} />
        </div>
        <details className="positioning-more">
          <summary>ホームページやチラシにも使える、紹介文の下書きを見る（コピーできます）</summary>
          <PositioningPanel positioning={result.positioning} />
        </details>
      </div>
    </div>

    {/* ④ 週次見守り（14日間無料） */}
    <div id="step-3">
      <section className="report-watch" id="watch-plan">
        <div className="shell report-watch-inner">
          <div>
            <span className="rp-eyebrow">4. このあとは、毎週おまかせ</span>
            <h2>同じ質問で、毎週AIに聞き直します。</h2>
            <p>名前が出た質問の数がどう変わったかを、毎週お知らせします。ページも自動で最新に保ちます。</p>
            <ul>
              <li>{WATCH_MONTHLY_PRICE_LABEL} / 週次の回答測定と差分確認</li>
              <li>月単位で利用でき、管理画面から解約手続きが可能</li>
              <li>最初の14日間は無料確認（開始時に有料化しません）</li>
            </ul>
          </div>
          <form onSubmit={startWatch}>
            <span className="rp-watch-flag">週次自動見守りプラン（14日間無料トライアル）</span>
            <label htmlFor="watch-email">
              結果を受け取るメールアドレス <span className="watch-email-optional">（空欄でも始められます）</span>
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
            <small>14日間は無料。終わっても自動で課金されません。</small>
          </form>
        </div>
      </section>
    </div>

    <ReportDetails result={result} sample={sample} primaryLoss={primaryLoss} primaryGap={primaryGap} citationCount={citationCount} />

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
          <a href="#step-1">結果</a>
          <a href="#step-2">取り返す</a>
          <a href="#step-3">毎週の見守り</a>
        </nav>

        <div>
          {!showCorrectionForm ? (
            <button type="button" className="report-subbar-correction-btn" onClick={() => setShowCorrectionForm(true)}>
              別の会社・地域で診断し直す
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

/** ① 結論：名前が出なかった質問の数と、いちばんすすめられた会社 */
function ReportHero({
  result,
  sample,
  host,
  hasMeasurement,
  readout,
  topCompetitorName,
}: {
  result: ScanResult;
  sample: boolean;
  host: string;
  hasMeasurement: boolean;
  readout: Readout;
  topCompetitorName?: string;
}) {
  return (
    <section id="step-1" className="rp-hero">
      <div className="shell rp-hero-inner">
        <div className="rp-hero-head">
          <span className="rp-eyebrow">自社専用 AI診断レポート{sample ? <em className="rp-sample">見本</em> : null}</span>
          <h1>{result.discovery.brandName}</h1>
          <p className="rp-hero-meta">
            <span>{host}</span>
            <span>{result.discovery.market}</span>
            <span>{sample ? "診断レポートの見本" : result.demo ? `模擬データ（${formatDate(result.measuredAt)}）` : `実測日: ${formatDate(result.measuredAt)}`}</span>
          </p>
        </div>

        {hasMeasurement ? (
          <div className="rp-verdict">
            <div className="rp-verdict-card rp-verdict-card--warn">
              <span>名前が出なかった質問</span>
              <strong>{readout.excluded}<small>問</small></strong>
              <em>回答を取得した{readout.successful}問のうち</em>
            </div>
            <div className="rp-verdict-card">
              <span>名前が出た質問</span>
              <strong>{readout.included}<small>問</small></strong>
              <em>{readout.label}・AIの答えの過半数で判定</em>
            </div>
            <div className="rp-verdict-card">
              <span>いちばん多くすすめられた会社</span>
              <strong className="rp-verdict-name">{topCompetitorName || "—"}</strong>
              <em>ChatGPT・Gemini・Perplexity の答えから</em>
            </div>
          </div>
        ) : (
          <p className="rp-verdict-empty">公開ページの情報は確認しました。AIの答えの測定はまだ終わっていないため、名前が出たかどうかは未判定です。</p>
        )}

        {hasMeasurement && readout.excluded > 0 ? (
          <div className="rp-hero-cta">
            <p><strong>大手と戦わなくても、御社の強みで取り返せます。</strong>名前が出なかった質問に向けて、AIが読めるページを無料でつくれます。</p>
            <div className="rp-hero-cta-actions">
              <a className="button button-primary" href="#step-2">取り返す準備を始める（無料） <ArrowIcon /></a>
              <a className="button button-secondary" href="#step-1-details">先にくわしく見る</a>
            </div>
          </div>
        ) : null}

        <ReportActions result={result} sample={sample} />
      </div>
    </section>
  );
}

/** ② 御社は何番目か：AIの答えに候補として出た回数をライバルと比べる */
function ReportRanking({ result }: { result: ScanResult }) {
  const own = { name: result.discovery.brandName, count: result.ownRecommendationCount, own: true };
  const rivals = result.competitors.map((competitor) => ({ name: competitor.name, count: competitor.recommendedCount, own: false }));
  if (!rivals.length) return null;
  const rank = 1 + rivals.filter((rival) => rival.count > own.count).length;
  const total = rivals.length + 1;
  const shown = [...rivals.slice(0, 5), own].sort((a, b) => b.count - a.count);
  const hidden = rivals.length - Math.min(5, rivals.length);
  const max = Math.max(1, ...shown.map((row) => row.count));

  return (
    <section id="step-1-details" className="rp-section rp-section--white">
      <div className="shell">
        <div className="rp-head">
          <span className="rp-eyebrow">1. 御社は、何番目？</span>
          <h2>AIの答えに名前が出た回数を、ライバルと比べました。</h2>
        </div>
        <div className="rp-rank">
          <div className="rp-rank-list">
            {shown.map((row) => (
              <div className={`rp-rank-row${row.own ? " is-own" : ""}`} key={`${row.own ? "own" : "rival"}-${row.name}`}>
                <span className="rp-rank-name">{row.own ? `${row.name}（御社）` : row.name}</span>
                <span className="rp-rank-bar"><i style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }} /></span>
                <span className="rp-rank-count">{row.count}回</span>
              </div>
            ))}
            {hidden > 0 ? <span className="rp-rank-more">… ほか{hidden}社</span> : null}
          </div>
          <div className="rp-rank-badge">
            <span>今回の答えでは</span>
            <strong>{total}社中{rank}番目</strong>
            <em>取得できた{result.successfulObservations}件の回答で数えた回数です。お客さんの数や市場シェアではありません。</em>
          </div>
        </div>
      </div>
    </section>
  );
}

/** ③ どの質問で負けているか：代表例を1つ大きく見せ、一覧を続ける */
function ReportLosses({ result, primaryLoss, primaryWinner }: { result: ScanResult; primaryLoss?: LostPrompt; primaryWinner: string | null }) {
  return (
    <section className="rp-section rp-section--tint">
      <div className="shell">
        <div className="rp-head">
          <span className="rp-eyebrow">2. どの質問で、負けている？</span>
          <h2>お客さんが聞きそうな質問ごとに、AIの答えを見ました。</h2>
        </div>
        {primaryLoss ? (
          <div className="rp-loss">
            <div className="rp-loss-q">「{primaryLoss.prompt}」</div>
            <svg className="rp-loss-arrow" width="36" height="20" viewBox="0 0 36 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h24M22 4l6 6-6 6" /></svg>
            <div className="rp-loss-a">
              <span>AIの答え</span>
              <strong>{primaryWinner || "他社の候補"}</strong>
              <em>御社の名前は出ていません</em>
            </div>
          </div>
        ) : null}
        <QuestionList result={result} />
      </div>
    </section>
  );
}

/** くわしいデータ：測定条件・参照元・AIの回答履歴は最後にまとめて折りたたむ */
function ReportDetails({
  result,
  sample,
  primaryLoss,
  primaryGap,
  citationCount,
}: {
  result: ScanResult;
  sample: boolean;
  primaryLoss?: LostPrompt;
  primaryGap?: EvidenceGap;
  citationCount: number;
}) {
  const [openObservation, setOpenObservation] = useState("");
  return (
    <section className="rp-section rp-section--tint rp-details">
      <div className="shell">
        <details>
          <summary>くわしいデータを見る（測定条件・AIが参考にしたページ・回答の記録）</summary>
          <div className="rp-details-body">
            <div className="report-measurement-grid">
              <div><small>調べたAI</small><span>ChatGPT / Perplexity / Google Gemini</span></div>
              <div><small>質問と回答</small><span>質問{result.panel.promptCount}問 × AIの回答（成功{result.successfulObservations}件）</span></div>
              <div><small>調べ方</small><span>{sample ? "見本のデータを使った表示例" : "各AIに同じ条件で質問し、取得できた回答を記録"}</span></div>
              <div><small>参考にされたページ</small><span>{citationCount}件</span></div>
            </div>
            <p className="report-measurement-caveat">
              測定日時: {formatDate(result.measuredAt)} JST。候補名はAIの回答に含まれた文字列をそのまま記録したものです。他社の品質・市場全体の順位・お客さんの流出を評価するものではありません。公開情報ページには測定ログや他社名を載せません。
            </p>

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

            {primaryLoss ? (
              <div className="observation-list">
                <h3>AIの回答の記録</h3>
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
            ) : null}
          </div>
        </details>
      </div>
    </section>
  );
}
