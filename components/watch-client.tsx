"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowIcon, WarningIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { toPublicWatch } from "@/lib/public-dto";
import type { PublicWatch, PublicWatchMeasurementRun } from "@/lib/public-dto";
import { sampleValueWatch as sampleWatch } from "@/lib/sample-value-proof";
import { ProfileAutomationControls } from "@/components/profile-automation-controls";
import { ExecutiveReferralCard } from "@/components/executive-referral-card";
import { compareMeasurementReadouts, readoutIdentity, safeReadoutResultHref, updateReadoutEmail } from "@/lib/measurement-readout";

import { ValueProofBoard } from "@/components/value-proof-board";

type WatchView = PublicWatch & { measurementRun?: PublicWatchMeasurementRun | null; publicProfileUrl?: string | null; resultUrl?: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

export function WatchClient({ showSellerLinks = false }: { showSellerLinks?: boolean } = {}) {
  const params = useSearchParams();
  const sample = params.get("sample") === "1";
  const urlToken = params.get("token") || "";
  const [sessionToken, setSessionToken] = useState("");

  useEffect(() => {
    if (sample || urlToken) return;
    let stale = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!stale && data?.authenticated && data?.user?.watchToken) {
          setSessionToken(data.user.watchToken);
        }
      })
      .catch(() => {});
    return () => { stale = true; };
  }, [sample, urlToken]);

  const token = urlToken || sessionToken;
  const demo = sample && params.get("demo") === "1";
  return <WatchViewClient key={readoutIdentity(sample, token)} sample={sample} token={token} showSellerLinks={showSellerLinks} demo={demo} />;
}

/** ライバル表は上位5社と、変化があった会社（新規・未出現・増減）だけを出す */
type RivalMovement = { newcomer?: boolean; departed?: boolean; diff: number | null };
function visibleRivals<T extends RivalMovement>(rows: T[]) {
  return rows.filter((row, index) => index < 5 || row.newcomer || row.departed || (row.diff !== null && row.diff !== 0));
}
function hiddenRivalCount(rows: RivalMovement[]) {
  return rows.length - visibleRivals(rows).length;
}

/** ① 今週の結論: 名前が出た質問の数の「前 → 今」を大きく見せる。 */
function TodayVerdict({ change, meaningfulChanges, changeHeadline, changeDescription, stopped, firstWeek }: {
  change: NonNullable<ReturnType<typeof useWatchChange>>;
  meaningfulChanges: boolean;
  changeHeadline: string;
  changeDescription: string;
  stopped: boolean;
  firstWeek: boolean;
}) {
  const before = change.baselineShortlisted;
  const after = change.latestShortlisted;
  const total = Math.max(1, change.after.successful || 0, before, after);
  const diff = after - before;
  return (
    <div className={`wt-verdict ${meaningfulChanges ? "has-change" : "no-change"}`}>
      <div className="wt-verdict-main">
        <span className="wt-verdict-label">{firstWeek ? "1回目の結果" : "今週の結論"}</span>
        <h2>{changeHeadline}</h2>
        {changeDescription ? <p>{changeDescription}</p> : null}
        {!firstWeek || stopped ? <span className="wt-verdict-state">
          <i aria-hidden="true" />
          {!firstWeek ? <strong>{!change.comparable ? "くらべられません" : meaningfulChanges ? "変化あり" : "変化なし"}</strong> : null}
          {stopped ? <small>見守りは止まっています</small> : null}
        </span> : null}
      </div>
      <div className="wt-verdict-figure" aria-label="名前が出た質問の数の変化">
        <span className="wt-verdict-figure-label">名前が出た質問</span>
        {firstWeek ? (
          <strong className="wt-verdict-diff">{after}問</strong>
        ) : change.comparable ? (
          <>
            <div className="wt-bars" aria-hidden="true">
              <span className="wt-bar wt-bar--before" style={{ height: `${Math.max(6, (before / total) * 100)}%` }}><b>{before}</b></span>
              <span className="wt-bar wt-bar--after" style={{ height: `${Math.max(6, (after / total) * 100)}%` }}><b>{after}</b></span>
            </div>
            <div className="wt-bars-axis"><span>初回</span><span>今回</span></div>
            <strong className="wt-verdict-diff">{before}問 → {after}問{diff ? `（${diff > 0 ? "+" : ""}${diff}）` : ""}</strong>
          </>
        ) : <strong className="wt-verdict-diff">くらべられません</strong>}
        <small>{change.after.label}</small>
      </div>
    </div>
  );
}

/** ② 北極星（AI顧客奪還シェア）と、補助の数字 */
function NorthStar({ watch, change }: {
  watch: WatchView;
  change: NonNullable<ReturnType<typeof useWatchChange>>;
}) {
  return (
    <section className="rp-section rp-section--white">
      <div className="shell">
        <div className="rp-head">
          <h2>AI顧客奪還シェア</h2>
          <p>毎週同じ50問をAIに聞いて、御社の名前が出た質問の割合です。お客さんの数や売上ではありません。</p>
        </div>
        {watch.northStar.status === "short-panel" ? (
          <p className="wt-note">いまは{watch.latest.panel.promptCount}問で測っています。有料プランでは50問で測ります。</p>
        ) : (
          <div className="table-responsive wt-table">
            <table>
              <thead><tr><th scope="col">AI</th><th scope="col">名前が出た質問</th><th scope="col">割合</th><th scope="col">取得できなかった質問</th><th scope="col">初回から</th></tr></thead>
              <tbody>
                {watch.northStar.providers.map((row) => (
                  <tr key={row.provider}>
                    <th scope="row">{row.provider === "openai" ? "ChatGPT" : row.provider === "gemini" ? "Gemini" : "Perplexity"}</th>
                    <td>{row.included}／{row.successful}問</td>
                    <td>{row.value === null ? "まだ測っていません" : `${row.value}%${row.missing ? "（一部だけ）" : ""}`}</td>
                    <td>{row.missing}問</td>
                    <td>{row.comparison ? `${row.comparison.before}% → ${row.comparison.after}%（同じ${row.comparison.count}問で）` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="wt-stats">
          <div>
            <span>名前が出た質問</span>
            <strong>{change.after.label}</strong>
            <small>{change.comparable ? `初回${change.baselineShortlisted}問 → 今回${change.latestShortlisted}問` : "今回の分だけ"}</small>
          </div>
          <div>
            <span>名前が出なかった質問</span>
            <strong>{change.after.successful ? `${change.latestLost} / ${change.after.successful}問` : "未測定"}</strong>
            {change.newPromptWins ? <small>{`初回から${change.newPromptWins}問で名前が出るように`}</small> : null}
          </div>
          <div>
            <span>AIが参考にしたページ</span>
            <strong>{change.comparable ? <>{change.baselineCitationCount} → {change.latestCitationCount}件</> : "—"}</strong>
            {change.comparable && change.newCitations ? <small>{`新しく${change.newCitations}件`}</small> : null}
          </div>
        </div>
        <p className="wt-note">今回：{formatDate(watch.northStar.measuredAt)}{watch.northStar.baselineMeasuredAt ? `／初回：${formatDate(watch.northStar.baselineMeasuredAt)}` : ""}</p>
      </div>
    </section>
  );
}

/** ② 何が変わったか: 候補入りの変化、参照元の推移、比較候補の動き。 */
function WhatChanged({ watch, change, profileDestination, profileUrl }: {
  watch: WatchView;
  change: NonNullable<ReturnType<typeof useWatchChange>>;
  profileDestination: string;
  profileUrl: string | null | undefined;
}) {
  const ownDiff = watch.latest.recommendationCoverage - watch.baseline.recommendationCoverage;
  return (
    <>
      <section className="watch-section shell">
        <div className="section-heading-simple">
          <p className="overline">今週の変化</p>
          <h2>名前が出るようになった質問</h2>
        </div>

        <div className="watch-won-prompts-container">
          <div className="won-prompts-header">
            <span className="won-icon">✓</span>
            <strong>{change.comparable ? `${change.newlyWonPrompts.length}問` : "くらべられません"}</strong>
          </div>
          <div className="won-prompts-list">
            {change.newlyWonPrompts.length ? change.newlyWonPrompts.map((prompt, idx) => (
              <div key={prompt.id} className="won-prompt-item">
                <span className="won-item-num">{idx + 1}</span>
                <p className="won-prompt-text">「{prompt.text}」</p>
              </div>
            )) : <p className="watch-muted-note">{change.comparable ? "今週、新しく名前が出た質問はありません。" : change.note}</p>}
          </div>
        </div>
      </section>

      <section className="watch-section shell watch-competitor-monitor">
        <div className="section-heading-simple">
          <p className="overline">ライバルとの比較</p>
          <h2>ライバルと比べて、どう変わったか</h2>
          <p>AIの答えに名前が出た割合です。</p>
        </div>

        {change.comparable ? (
          <div className="watch-comp-table-wrapper">
            <table className="watch-comp-table">
              <thead>
                <tr>
                  <th>会社</th>
                  <th>初回</th>
                  <th>今回</th>
                  <th>変化</th>
                </tr>
              </thead>
              <tbody>
                <tr className="row-own-company">
                  <td>
                    <div className="watch-comp-own">
                      <strong>{watch.latest.discovery.brandName}（御社）</strong>
                      <Link href={profileDestination} target="_blank" rel="noreferrer" className="watch-comp-own-link">
                        {profileUrl ? "公開ページ ↗" : "診断結果 ↗"}
                      </Link>
                    </div>
                  </td>
                  <td>{watch.baseline.recommendationCoverage}%</td>
                  <td><strong>{watch.latest.recommendationCoverage}%</strong></td>
                  <td>{ownDiff === 0 ? <span className="badge-neutral">変化なし</span> : <span className={ownDiff > 0 ? "badge-gain" : "badge-loss"}>{ownDiff > 0 ? "+" : ""}{ownDiff}%</span>}</td>
                </tr>
                {visibleRivals(change.competitorMovements).map((comp) => (
                  <tr key={comp.name}>
                    <td><span>{comp.name}</span></td>
                    <td>{comp.baselineCoverage}%</td>
                    <td>{comp.latestCoverage}%</td>
                    <td>
                      {comp.newcomer ? <span className="badge-warning">今回はじめて</span> : comp.departed ? <span className="badge-loss">今回は出ず</span> : comp.diff === null ? <span>—</span> : comp.diff < 0 ? (
                        <span className="badge-loss">{comp.diff}%</span>
                      ) : comp.diff > 0 ? (
                        <span className="badge-warning">+{comp.diff}%</span>
                      ) : (
                        <span className="badge-neutral">変化なし</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hiddenRivalCount(change.competitorMovements) ? <p className="wt-note wt-rival-more">ほか{hiddenRivalCount(change.competitorMovements)}社は変化なし</p> : null}
          </div>
        ) : <p>{change.note}</p>}
      </section>
    </>
  );
}

/** ③ 次にやること: 未解決の質問と、公開前の改善文案。 */
function NextActions({ change, primaryLoss, visibleChangePack }: {
  change: NonNullable<ReturnType<typeof useWatchChange>>;
  primaryLoss: WatchView["latest"]["lostPrompts"][number] | undefined;
  visibleChangePack: WatchView["changePack"];
}) {
  return (
    <section className="watch-section shell watch-change-pack">
      <div className="section-heading-simple">
        <h2>次にやること</h2>
      </div>

      {change.comparable && primaryLoss ? (
        <div className="watch-current-loss">
          <small>まず取り返したい質問</small>
          <strong>「{primaryLoss.prompt}」</strong>
          <span>AIがすすめた会社：{primaryLoss.winner || "—"}</span>
        </div>
      ) : null}

      {visibleChangePack ? (
        <div className="change-pack-document">
          {visibleChangePack.items.map((item, index) => (
            <article key={item.id}>
              <div className="change-pack-heading">
                <span>案 {index + 1}</span>
                <strong>{item.title}</strong>
              </div>
              <div className="draft-heading">
                <small>見出し</small>
                <h3>{item.proposedTitle}</h3>
                <p>{item.proposedLead}</p>
              </div>
              {item.sections.slice(0, 3).map((section) => (
                <div className="draft-section" key={section.heading}>
                  <small>{section.heading}</small>
                  <p>{section.body}</p>
                </div>
              ))}
              {item.faq.length ? (
                <div className="draft-faq">
                  <small>よくある質問</small>
                  {item.faq.slice(0, 2).map((faq) => (
                    <p key={faq.question}>
                      <strong>Q. {faq.question}</strong>
                      <span>A. {faq.answer}</span>
                    </p>
                  ))}
                </div>
              ) : null}
              <footer>まだ公開していません</footer>
            </article>
          ))}
        </div>
      ) : <p role="status">まだ案はありません。</p>}
    </section>
  );
}

/** くわしいデータの最後：今月のまとめと、ホームページで見つからなかった情報 */
function DetailLog({ watch }: { watch: WatchView }) {
  const gaps = watch.latest.evidenceGaps.slice(0, 5);
  return (
    <section className="watch-section shell" aria-label="今月のまとめ">
      {watch.monthlyReport ? (
        <>
          <h2>今月のまとめ（{watch.monthlyReport.period}）</h2>
          <div className="watch-log-stats">
            <div className="ui-stat watch-log-stat"><span className="ui-stat__label">AIに聞いた回数</span><strong className="ui-stat__value">{watch.monthlyReport.aiObservationCount}回</strong></div>
            <div className="ui-stat watch-log-stat"><span className="ui-stat__label">AIが参考にしたページの変化</span><strong className="ui-stat__value">{watch.monthlyReport.citationChangeCount}件</strong></div>
            <div className="ui-stat watch-log-stat"><span className="ui-stat__label">公開ページの自動更新</span><strong className="ui-stat__value">{watch.monthlyReport.profileUpdateCount}回</strong></div>
            <div className="ui-stat watch-log-stat"><span className="ui-stat__label">つくった案</span><strong className="ui-stat__value">{watch.monthlyReport.autoActionCount}件</strong></div>
          </div>
        </>
      ) : null}
      {gaps.length ? (
        <>
          <h3 className="watch-gap-title">ホームページで見つからなかった情報</h3>
          <ul className="watch-gap-list">
            {gaps.map((gap) => {
              const answer = watch.evidence.find((item) => item.gapId === gap.id);
              return <li key={gap.id}><strong>{gap.label}</strong><small>{gap.relatedPromptCount}問に関係</small>{answer ? <span>登録済み：{answer.value}</span> : null}</li>;
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function useWatchChange(watch: WatchView | null) {
  return useMemo(() => {
    if (!watch) return null;
    const comparison = compareMeasurementReadouts(watch.baseline, watch.latest, watch.takeBackShare.status === "available");
    return {
      ...comparison,
      baselineShortlisted: comparison.before.included,
      latestShortlisted: comparison.after.included,
      baselineLost: comparison.before.excluded,
      latestLost: comparison.after.excluded,
      newPromptWins: comparison.wins.length,
      newPromptLosses: comparison.losses.length,
      newCitations: comparison.addedCitations,
      newlyWonPrompts: (watch.latest.prompts || []).filter((p) => comparison.wins.includes(p.id)),
      newlyLostPrompts: (watch.latest.prompts || []).filter((p) => comparison.losses.includes(p.id)),
      competitorMovements: comparison.competitorMovements.filter((row) => row.name !== watch.latest.discovery.brandName),
      takeBackShare: watch.takeBackShare,
    };
  }, [watch]);
}

function WatchViewClient({ sample, token, showSellerLinks, demo = false }: { sample: boolean; token: string; showSellerLinks: boolean; demo?: boolean }) {
  const lifecycle = useRef<AbortController | null>(null);
  const emailRevision = useRef(0);
  const [watch, setWatch] = useState<WatchView | null>(sample ? toPublicWatch(sampleWatch()) : null);
  const [loading, setLoading] = useState(!sample);
  const [error, setError] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [bookmarkStatus, setBookmarkStatus] = useState("");
  const profileUrl = sample ? "/ai/company/aoba-souzoku?sample=1" : watch?.publicProfileUrl;
  const profileDestination = profileUrl || safeReadoutResultHref(watch?.resultUrl, watch?.baseline.scanId);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    if (sample) return () => controller.abort();
    if (!token) { setLoading(false); return () => controller.abort(); }
    let cancelled = false;
    fetch(`/api/watch?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as WatchView & { error?: string };
        if (!response.ok) throw new Error(data.error || "見守りの情報を読み込めませんでした。");
        if (!cancelled) {
          setWatch(data);
        }
      })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "見守りの情報を読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [sample, token]);

  const measurementStatus = watch?.measurementRun?.status;
  useEffect(() => {
    if (sample || !token || !measurementStatus || !["pending", "running"].includes(measurementStatus)) return;
    let cancelled = false;
    let busy = false;
    const controller = new AbortController();
    const poll = async () => {
      if (busy) return;
      busy = true;
      const requestedEmailRevision = emailRevision.current;
      try {
        const response = await fetch(`/api/watch?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as WatchView & { error?: string };
        if (!response.ok) throw new Error(data.error || "見守りの情報を読み込めませんでした。");
        if (!cancelled) {
          setWatch((previous) => previous && requestedEmailRevision !== emailRevision.current ? { ...data, emailConfigured: previous.emailConfigured, maskedEmail: previous.maskedEmail } : data);
          setError("");
        }
      } catch (caught) {
        // Keep the current result visible while a transient poll fails. The
        // next interval can recover without interrupting the measurement.
        if (!cancelled) setError(caught instanceof Error ? caught.message : "見守りの情報を読み込めませんでした。");
      } finally {
        busy = false;
      }
    };
    const interval = window.setInterval(poll, 4_000);
    return () => { cancelled = true; controller.abort(); window.clearInterval(interval); };
  }, [measurementStatus, sample, token]);

  const change = useWatchChange(watch);
  const [advancing, setAdvancing] = useState(false);

  /** デモ専用：次の週の測定を今すぐ実行して、週次報告の変化を確かめる */
  async function advanceDemoWeek() {
    if (!token || advancing) return;
    setAdvancing(true); setError("");
    try {
      const response = await fetch("/api/watch/demo-advance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "次の週の測定を実行できませんでした。");
      const refreshed = await fetch(`/api/watch?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const next = await refreshed.json() as WatchView & { error?: string };
      if (!refreshed.ok) throw new Error(next.error || "見守りの情報を読み込めませんでした。");
      setWatch(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "次の週の測定を実行できませんでした。");
    } finally {
      setAdvancing(false);
    }
  }

  async function manageBilling() {
    if (sample) return;
    const signal = lifecycle.current!.signal;
    setCheckoutBusy(true); setError("");
    try {
      const endpoint = watch?.paid ? "/api/billing/portal" : "/api/billing/checkout";
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }), signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "お支払いの画面を開けませんでした。");
      if (!signal.aborted) window.location.assign(data.url);
    } catch (caught) { if (!signal.aborted) setError(caught instanceof Error ? caught.message : "お支払いの画面を開けませんでした。"); }
    finally { if (!signal.aborted) setCheckoutBusy(false); }
  }

  async function saveNotificationEmail(e: FormEvent) {
    e.preventDefault();
    await setNotification(notificationEmail);
  }

  async function setNotification(email: string) {
    if (!token || sample) return;
    const signal = lifecycle.current!.signal;
    setSavingEmail(true);
    setEmailStatus("");
    try {
      const data = await updateReadoutEmail(token, email, signal);
      if (signal.aborted) return;
      emailRevision.current += 1;
      setEmailStatus(data.emailConfigured ? "保存しました。" : "通知を止めました。");
      setNotificationEmail("");
      setShowEmailForm(false);
      setWatch((prev) => (prev ? { ...prev, ...data } : prev));
    } catch (caught) {
      if (!signal.aborted) setEmailStatus(caught instanceof Error ? caught.message : "更新できませんでした。");
    } finally {
      if (!signal.aborted) setSavingEmail(false);
    }
  }

  async function copyBookmark() {
    const signal = lifecycle.current!.signal;
    try {
      await navigator.clipboard.writeText(new URL(`/watch?token=${encodeURIComponent(token)}`, window.location.origin).href);
      if (!signal.aborted) setBookmarkStatus("コピーしました。メモなどに保存してください。");
    } catch {
      if (!signal.aborted) setBookmarkStatus("コピーできませんでした。このページをブックマークしてください。");
    }
  }

  if (loading) return <div className="full-loading" role="status">読み込んでいます。</div>;
  if (!watch || !change) return <main className="empty-page"><SiteHeader compact /><div className="shell empty-content">
    <h1>見守りの画面を開けませんでした。</h1>
    <p>{error || "見守りの画面を見るには、ログインするか、メールで届いた管理用リンクを開いてください。"}</p>
    <div className="watch-empty-actions">
      <Link className="button button-primary" href="/login">ログインする</Link>
      <Link className="button button-secondary" href="/manage">管理用リンクで開く</Link>
    </div>
    <p className="watch-empty-cta"><Link href="/">はじめての方は、無料で診断</Link></p>
  </div></main>;

  const primaryLoss = watch.latest.lostPrompts[0];
  const stopped = ["expired", "cancelled", "past_due"].includes(watch.status);
  const measurementRun = watch.measurementRun;
  const measurementActive = !stopped && Boolean(measurementRun && ["pending", "running"].includes(measurementRun.status));
  const statusText = watch.status === "expired" ? "無料期間は終わりました。自動で課金はされていません。" : watch.status === "cancelled" ? "解約済みです。これまでの結果は見られます。" : watch.status === "past_due" ? "お支払いを確認できませんでした。" : "";
  const meaningfulChanges = change.meaningful;
  // 始めたばかり（測定が1回だけ）の週は、くらべる相手がまだない
  const firstWeek = watch.history.length <= 1;
  const changeHeadline = firstWeek
    ? "見守りを始めました。"
    : !change.comparable
    ? "初回とくらべられませんでした。"
    : change.newPromptWins > 0
    ? `${change.newPromptWins}問で、新しく名前が出ました。${change.newPromptLosses > 0 ? ` ${change.newPromptLosses}問で、名前が出なくなりました。` : ""}`
    : change.newPromptLosses > 0
      ? `${change.newPromptLosses}問で、名前が出なくなりました。`
      : change.answerChanged ? "名前が出た数は同じですが、AIがすすめる会社が変わりました。"
        : meaningfulChanges ? "名前が出た数は同じですが、AIが参考にしたページが変わりました。"
          : "今週は、名前が出た数に変化はありませんでした。";
  const changeDescription = firstWeek
    ? (stopped ? "" : `${formatDate(watch.nextRunAt)}に、同じ質問でもう一度AIに聞きます。`)
    : change.comparable
      ? `同じ${change.after.successful}問で、初回（${formatDate(watch.baseline.measuredAt)}）と今回（${formatDate(watch.latest.measuredAt)}）をくらべました。`
      : change.note;
  const visibleChangePack = watch.changePack?.items.length ? watch.changePack : null;
  const resultHref = safeReadoutResultHref(watch.resultUrl, watch.baseline.scanId);
  const headerContext = !sample ? { resultHref, profileHref: `/profile/manage?watchToken=${encodeURIComponent(token)}`, watchHref: `/watch?token=${encodeURIComponent(token)}` } : undefined;

  return (
    <main className="watch-page">
      <SiteHeader compact context={headerContext} />

      <div className="report-subbar">
        <div className="shell report-subbar-inner">
          <div className="report-subbar-breadcrumb">
            <Link href="/">ホーム</Link>
            <span>/</span>
            <span className="report-subbar-current">毎週の見守り</span>
            <span className="report-subbar-brand">{watch.latest.discovery.brandName}</span>
            {sample ? <span className="report-subbar-sample">見本</span> : null}
          </div>
          <span className="watch-subbar-status">{sample ? "" : watch.status === "trial" ? "無料期間中" : watch.status === "expired" ? "無料期間は終了" : watch.status === "cancelled" ? "解約済み" : watch.status === "past_due" ? "お支払いの確認が必要" : watch.paid ? "契約中" : ""}</span>
        </div>
      </div>

      {sample && demo ? (
        <div className="rp-demo-banner" role="status">
          <div className="shell"><strong>デモ表示です。</strong>見本のお店の画面です。</div>
        </div>
      ) : !sample && watch.latest.demo ? (
        <div className="rp-demo-banner" role="status">
          <div className="shell rp-demo-banner-row">
            <span><strong>デモ表示です。</strong>AIの答えは模擬データです。</span>
            <button type="button" className="rp-demo-banner-action" disabled={advancing} onClick={() => void advanceDemoWeek()}>{advancing ? "次の週を測定中…" : "1週間後の報告を見る（デモ）"}</button>
          </div>
        </div>
      ) : null}
      <section className="rp-hero wt-hero">
        <div className="shell rp-hero-inner">
          <div className="wt-hero-row">
            <div className="rp-hero-head">
              <span className="rp-eyebrow">毎週の報告{sample ? <em className="rp-sample">見本</em> : null}</span>
              <h1>{watch.latest.discovery.brandName}</h1>
              <p className="rp-hero-meta">
                <span>{stopped ? "見守りは止まっています（これまでの結果を表示）" : `毎週、同じ${watch.latest.panel.promptCount}問をAIに聞いています`}</span>
                {stopped ? <span className="watch-status stopped"><i />停止中</span> : <span className="watch-status"><i />次の測定 {formatDate(watch.nextRunAt)}</span>}
              </p>
            </div>
            <div className="wt-hero-actions">
              <Link className="button button-secondary" href={profileDestination} target="_blank" rel="noreferrer">
                {profileUrl ? "公開ページを見る ↗" : "診断結果を見る ↗"}
              </Link>
              {sample ? (
                <Link className="button button-primary" href="/pricing">料金を見る <ArrowIcon /></Link>
              ) : (
                <button className="button button-primary" type="button" onClick={() => void manageBilling()} disabled={checkoutBusy}>
                  {checkoutBusy ? "開いています…" : watch.paid ? "ご契約・お支払い" : "有料で続ける"}
                  <ArrowIcon />
                </button>
              )}
            </div>
          </div>
          {TodayVerdict({ change, meaningfulChanges, changeHeadline, changeDescription, stopped, firstWeek })}
        </div>
      </section>

      {statusText ? (
        <section className="shell watch-inline-notice">
          <div className="ui-notice ui-notice--warn"><WarningIcon /><span>{statusText}</span></div>
        </section>
      ) : null}

      {measurementActive && measurementRun ? (
        <section className="shell watch-inline-notice" role="status" aria-live="polite">
          <div className="ui-notice">
            <span>AIに聞き直しています。</span>
            <strong>{measurementRun.completedPrompts} / {measurementRun.totalPrompts}問</strong>
          </div>
        </section>
      ) : null}

      {NextActions({ change, primaryLoss, visibleChangePack })}

      {WhatChanged({ watch, change, profileDestination, profileUrl })}

      <ProfileAutomationControls scanId={new URL(resultHref, "https://rovan.invalid").searchParams.get("id") || watch.baseline.scanId} watchToken={token} sample={sample} hasPublicPage={Boolean(profileUrl)} />

      <section className="watch-section shell watch-notify" aria-label="メール通知">
        <h2>変化があった時だけ、メールでお知らせ</h2>
        <div className="ui-card watch-notify-card">
          <div className="watch-notify-row">
            <div className="watch-notify-info">
              {watch.emailConfigured && !showEmailForm ? (
                <span>
                  通知先：<strong className="watch-notify-email">{watch.maskedEmail || notificationEmail}</strong>{stopped ? "（いまは止まっています）" : ""}
                </span>
              ) : null}
              {emailStatus ? <span role="status" className="watch-notify-status">{emailStatus}</span> : null}
              {sample ? <span className="watch-muted-note">見本では設定できません。</span> : watch.emailConfigured ? <button type="button" className="watch-text-button" disabled={savingEmail} onClick={() => void setNotification("")}>通知を止める</button> : null}
            </div>

            {!showEmailForm ? (
              <button type="button" className="button button-secondary watch-notify-toggle" disabled={sample || savingEmail} onClick={() => setShowEmailForm(true)}>
                {watch.emailConfigured ? "通知先を変える" : "メールアドレスを登録する"}
              </button>
            ) : (
              <form onSubmit={saveNotificationEmail} className="watch-notify-form">
                <input
                  type="email"
                  name="notificationEmail"
                  aria-label="通知先メールアドレス"
                  placeholder="you@company.jp"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  required
                  autoFocus
                />
                <button type="submit" className="button button-primary watch-notify-save" disabled={savingEmail}>{savingEmail ? "保存中…" : "保存"}</button>
                <button type="button" className="watch-text-button" onClick={() => setShowEmailForm(false)}>閉じる</button>
              </form>
            )}
          </div>
        </div>

        {!sample ? (
          <div className="watch-bookmark">
            <p className="manage-link-title">管理用リンク</p>
            <p className="watch-muted-note">この画面に戻るときに使います。人には送らないでください。</p>
            <button type="button" className="button button-secondary" onClick={() => void copyBookmark()}>管理用リンクをコピー</button>
            {bookmarkStatus ? <p role="status" className="watch-notify-status">{bookmarkStatus}</p> : null}
          </div>
        ) : null}
      </section>

      {/* くわしいデータ（北極星の表・回答ごとの結果・測定の記録）は最後にまとめて折りたたむ */}
      <section className="rp-section rp-section--tint rp-details">
        <div className="shell">
          <details>
            <summary>くわしいデータを見る</summary>
            <div className="rp-details-body">
              {NorthStar({ watch, change })}

              <ValueProofBoard key={readoutIdentity(sample, token)} sample={sample} token={token} revision={watch.updatedAt} />

              {DetailLog({ watch })}

            </div>
          </details>
        </div>
      </section>

      <ExecutiveReferralCard />

      {error ? <p className="floating-error" role="alert">{error}</p> : null}
      <SiteFooter watchToken={sample ? undefined : token} showSellerLinks={showSellerLinks} />
    </main>
  );
}
