"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ArrowIcon } from "@/components/icons";
import { CitationMap } from "@/components/citation-map";
import { QuestionList } from "@/components/question-list";
import { ReportActions } from "@/components/report-actions";
import { PublicProfileActions } from "@/components/public-profile-actions";
import { sampleResult } from "@/lib/sample-data";
import { isNoSiteTarget } from "@/lib/no-site";
import { WATCH_MONTHLY_PRICE_LABEL } from "@/lib/pricing";
import { measurementReadout, readoutIdentity } from "@/lib/measurement-readout";
import { aiAccessFixText, summarizeAiAccess, type AiAccessSummary } from "@/lib/ai-access";
import type { LostPrompt, ScanRecord, ScanResult } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

/** 内部の注意書きのうち、結果の読み方が変わるものだけをふつうの言葉で出す（取得できなかった問数は結論の欄に出ている） */
function userFacingWarning(value: string) {
  if (value.includes("市場認識") || value.includes("市場の信頼")) return "比べる相手の会社が少なかったため、順位は目安です。";
  if (value.includes("競合候補")) return "比べる相手の会社を見つけられませんでした。";
  return "";
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
    if (!scanId) { setError("このリンクでは診断結果を開けません。"); setLoading(false); return () => controller.abort(); }
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
      if (!response.ok) throw new Error(data.error || "見守りを始められませんでした。もう一度お試しください。");
      if (!signal.aborted) router.push(`/watch?token=${encodeURIComponent(data.token)}`);
    } catch (caught) { if (!signal.aborted) setError(caught instanceof Error ? caught.message : "見守りを始められませんでした。もう一度お試しください。"); }
    finally { if (!signal.aborted) setWatchBusy(false); }
  }

  if (loading) return <div className="full-loading" role="status">診断結果を読み込んでいます。</div>;
  if (!result) return <main className="empty-page"><SiteHeader compact /><div className="shell empty-content"><h1>診断結果を開けませんでした。</h1><p>{error}</p><div className="empty-actions"><Link className="button button-primary" href="/">新しく無料診断する</Link><Link className="button button-secondary" href="/manage">過去の結果を開く</Link></div></div></main>;

  const topCompetitor = result.competitors[0];
  const primaryLoss = result.lostPrompts[0];
  const readout = measurementReadout(result);
  const hasMeasurement = readout.successful > 0;
  const primaryWinner = primaryLoss?.winner || topCompetitor?.name || null;
  const host = isNoSiteTarget(result.targetUrl) ? "ホームページなし（お店の名前で調査）" : (() => { try { return new URL(result.targetUrl).hostname.replace(/^www\./, ""); } catch { return result.targetUrl; } })();
  const displayWarnings = [...new Set(result.warnings.map(userFacingWarning))].filter(Boolean);
  const aiAccess = summarizeAiAccess(result.visibilityAudit);

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
    {aiAccess?.status === "blocked" ? <AiAccessAlert summary={aiAccess} siteUrl={result.targetUrl} /> : null}
    <ReportRanking result={result} />
    <ReportLosses result={result} primaryLoss={primaryLoss} primaryWinner={primaryWinner} />

    {/* ③ 次にやること：強みを選んで、公開ページをつくる */}
    <div id="step-2" className="report-publish-section rp-section rp-section--white">
      <div className="shell">
        <div className="rp-head">
          <span className="rp-eyebrow">3. 何をすれば、名前が出る？</span>
          <h2>御社の強みを、AIが読めるページにします。</h2>
          <p>公開の前に内容を確認できます。御社のサイトは書きかえません。</p>
        </div>
        <div className="report-publish-actions">
          <PublicProfileActions result={result} sample={sample} />
        </div>
      </div>
    </div>

    {/* ④ 毎週の見守り（14日間無料） */}
    <div id="step-3">
      <section className="report-watch" id="watch-plan">
        <div className="shell report-watch-inner">
          <div>
            <span className="rp-eyebrow">4. このあとは、毎週おまかせ</span>
            <h2>同じ質問で、毎週AIに聞き直します。</h2>
            <p>変化を毎週お知らせし、ページも最新に保ちます。</p>
            <ul>
              <li>{WATCH_MONTHLY_PRICE_LABEL}</li>
              <li>いつでも解約できます</li>
            </ul>
          </div>
          <form onSubmit={startWatch}>
            <span className="rp-watch-flag">最初の14日間は無料</span>
            <label htmlFor="watch-email">
              通知を受け取るメール <span className="watch-email-optional">（任意）</span>
            </label>
            <input
              id="watch-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="メールアドレス"
            />
            <button className="button button-primary" disabled={watchBusy}>
              {watchBusy ? "準備しています…" : "14日間無料で始める"}
              <ArrowIcon />
            </button>
            <small>14日間が終わっても、自動で課金されません。</small>
          </form>
        </div>
      </section>
    </div>

    <ReportDetails result={result} sample={sample} aiAccess={aiAccess} />

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
          <span className="report-subbar-current">診断結果</span>
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
                aria-label="社名・店名、Instagram、ホームページのどれか"
                placeholder="例: 青葉ベーカリー 高崎"
                value={correctionQuery}
                onChange={(event) => setCorrectionQuery(event.target.value)}
                autoFocus
              />
              <button type="submit">診断する</button>
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
            <span>{sample ? "診断レポートの見本" : result.demo ? `模擬データ（${formatDate(result.measuredAt)}）` : `調べた日：${formatDate(result.measuredAt)}`}</span>
          </p>
        </div>

        {hasMeasurement ? (
          <div className="rp-verdict">
            <div className="rp-verdict-card rp-verdict-card--warn">
              <span>名前が出なかった質問</span>
              <strong>{readout.excluded}<small>問</small></strong>
              <em>{readout.successful}問のうち</em>
            </div>
            <div className="rp-verdict-card">
              <span>名前が出た質問</span>
              <strong>{readout.included}<small>問</small></strong>
              <em>{readout.label}</em>
            </div>
            <div className="rp-verdict-card">
              <span>いちばん多くすすめられた会社</span>
              <strong className="rp-verdict-name">{topCompetitorName || "—"}</strong>
              <em>ChatGPT・Gemini・Perplexity の答えから</em>
            </div>
          </div>
        ) : (
          <p className="rp-verdict-empty">AIの答えを取得できませんでした。少し時間をおいて、もう一度診断してください。</p>
        )}

        {hasMeasurement && readout.excluded > 0 ? (
          <div className="rp-hero-cta">
            <p><strong>大手と同じ土俵で戦わず、御社の強みで取り返しにいきましょう。</strong>名前が出なかった質問に向けて、AIが読めるページを無料でつくれます。</p>
            <div className="rp-hero-cta-actions">
              <a className="button button-primary" href="#step-2">取り返す準備を始める（無料） <ArrowIcon /></a>
              <a className="button button-secondary" href="#step-1-details">先にくわしく見る</a>
            </div>
          </div>
        ) : null}

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
            <em>AIの答え{result.successfulObservations}件で数えました</em>
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

/** くわしいデータ：調べた条件・AIが参考にしたページ・保存は最後にまとめて折りたたむ */
function ReportDetails({ result, sample, aiAccess }: { result: ScanResult; sample: boolean; aiAccess: AiAccessSummary | null }) {
  return (
    <section className="rp-section rp-section--tint rp-details">
      <div className="shell">
        <details>
          <summary>くわしいデータを見る</summary>
          <div className="rp-details-body">
            <div className="report-measurement-grid">
              <div><small>調べたAI</small><span>ChatGPT・Gemini・Perplexity</span></div>
              <div><small>質問</small><span>{result.panel.promptCount}問</span></div>
              <div><small>調べた日</small><span>{sample ? "見本" : formatDate(result.measuredAt)}</span></div>
              {aiAccess ? <div><small>AIのロボット</small><span>{aiAccess.status === "blocked" ? "読めない設定があります" : "ホームページを読めます"}</span></div> : null}
            </div>
            {aiAccess?.status === "check" ? (
              <div className="rp-access-note">
                <p>ホームページは Cloudflare を使っています。Cloudflare の初期設定では、AIのロボットが止められていることがあります。念のため、ホームページを作った会社に確認してください。</p>
                <CopyFixText text={aiAccessFixText(aiAccess, result.targetUrl)} />
              </div>
            ) : null}
            <CitationMap result={result} />
            <ReportActions result={result} sample={sample} />
          </div>
        </details>
      </div>
    </section>
  );
}

/** AIがホームページを読めない設定を見つけたとき、結論のすぐ下に出す */
function AiAccessAlert({ summary, siteUrl }: { summary: AiAccessSummary; siteUrl: string }) {
  const names = summary.blocked.map((item) => item.ai).join("・");
  return (
    <section className="shell rp-access-alert" role="alert">
      <strong>{names ? `${names}が、御社のホームページを読めない設定になっています。` : "トップページが、検索に出ない設定になっています。"}</strong>
      <p>このままでは、AIに名前が出にくくなります。ホームページを作った会社に、次の文面を送ってください。</p>
      <CopyFixText text={aiAccessFixText(summary, siteUrl)} />
    </section>
  );
}

function CopyFixText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rp-fix-text">
      <details>
        <summary>送る文面を見る</summary>
        <pre>{text}</pre>
      </details>
      <button type="button" className="button button-secondary" onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* コピーできない環境では文面を開いて選んでもらう */ }
      }}>{copied ? "コピーしました" : "文面をコピー"}</button>
    </div>
  );
}
