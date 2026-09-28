"use client";

import Link from "next/link";
import { ArrowIcon, CheckIcon, LockIcon } from "@/components/icons";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { WatchRecord } from "@/lib/types";
import { sampleAiReadable } from "@/lib/sample-report-content";

function normalizeDomain(value: string) {
  return value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0] || "yourcompany.jp";
}

function downloadText(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AiReadableClient() {
  const params = useSearchParams();
  const sample = params.get("sample") === "1";
  const token = params.get("token") || "";
  const url = params.get("url") || "";
  return <AiReadableContent key={JSON.stringify([sample, token, url])} sample={sample} token={token} url={url} />;
}

function AiReadableContent({ sample, token, url }: { sample: boolean; token: string; url: string }) {
  const domain = sample ? "aoba-souzoku.example" : normalizeDomain(url || "yourcompany.jp");
  const [watch, setWatch] = useState<WatchRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(token) && !sample);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sample || !token) return;
    const controller = new AbortController();
    fetch(`/api/watch?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as WatchRecord & { error?: string };
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(data.error || "週次見守りの情報を取得できませんでした。");
        setWatch(data);
      })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "週次見守りの情報を取得できませんでした。"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sample, token]);

  if (loading) return <div className="full-loading">下書きを読み込んでいます。</div>;

  const draft = sample ? sampleAiReadable() : watch?.changePack?.aiReadable || null;
  const resolvedDomain = watch ? normalizeDomain(watch.latest.targetUrl) : domain;
  const backHref = sample ? "/watch?sample=1" : token ? `/watch?token=${encodeURIComponent(token)}` : "/manage";

  return <main className="document-page ai-info-page">
    <header className="site-header site-header-compact"><div className="shell header-inner"><Link className="brand" href={backHref}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span><strong>Rovan</strong><small>生成AI・競合診断</small></span></Link><Link className="text-button" href={backHref}>戻る <ArrowIcon /></Link></div></header>
    <section className="document-hero ai-info-hero"><div className="shell"><p className="overline">AI向け公開情報 / {resolvedDomain}</p><h1>AIが確認しやすい、<br />会社の事実を整える。</h1><p>公開ページから取得できた事実と参照元を、AIにも人にも読みやすい下書きにまとめます。推薦や順位を買うページではありません。</p><div className="ai-info-boundary"><LockIcon /><span><strong>公開前に確認します。</strong> Rovanが対象サイトを自動変更したり、外部の評価を装ったりすることはありません。</span></div></div></section>

    <section className="document-body shell ai-info-body">
      {error ? <div className="document-callout ai-info-error"><strong>下書きを表示できません。</strong><p>{error}</p></div> : null}
      {!draft ? <section className="ai-info-empty"><p className="overline">下書きの作成</p><h2>この下書きはまだ作成されていません。</h2><p>AI推薦データの公開・管理は、診断結果または公開ページの管理画面から進められます。この画面は追加の確認用ファイルを表示する画面です。自社サイトへの設置は不要です。</p><Link className="button button-primary" href={backHref}>{token || sample ? "週次見守りへ戻る" : "自分の管理画面を開く"} <ArrowIcon /></Link></section> : <>
        <div className="ai-info-source"><div><p className="overline">取得した公開ページから作成</p><h2>下書きの中身を確認する。</h2><p>{draft.sourcePages.length}ページをもとに作成。自動公開はしません。</p></div><span>{sample ? "見本" : "人が確認する下書き"}</span></div>
        <div className="ai-info-grid">
          <section className="ai-info-panel"><header><div><p className="overline">1 / 確認できるページ</p><h3>どのページを使ったか。</h3></div><span>{draft.sourcePages.length}ページ</span></header><ul className="ai-info-page-list">{draft.sourcePages.map((page) => <li key={page.url}><strong>{page.title}</strong><span>{page.description || "説明を確認中"}</span><small>{page.url}</small></li>)}</ul></section>
          <section className="ai-info-panel"><header><div><p className="overline">2 / 取得するファイル</p><h3>使う前に、内容を確認する。</h3></div><span>2種類</span></header><div className="ai-info-downloads"><button className="button button-secondary" type="button" onClick={() => downloadText(`${draft.suggestedFileName}.txt`, draft.llmsTxt, "text/plain;charset=utf-8")}>公開情報のテキストを取得 <ArrowIcon /></button><button className="button button-secondary" type="button" onClick={() => downloadText(`${draft.suggestedFileName}.jsonld`, draft.jsonLd, "application/ld+json;charset=utf-8")}>構造化データを取得 <ArrowIcon /></button></div><details className="ai-info-code"><summary>ファイルの内容を見る</summary><pre>{draft.llmsTxt}</pre></details></section>
        </div>
        <section className="ai-info-review"><div><p className="overline">3 / 公開前チェック</p><h2>確認した内容を、Rovanの公開ページへ。</h2><p>ファイルの取得・自社サイトへの設置は任意です。Rovanの利用に自社サイトの改修は必要ありません。公開ページの管理画面で、参照元と掲載内容を確認できます。</p></div><ul>{draft.publishChecks.map((check) => <li key={check}><CheckIcon />{check}</li>)}</ul><Link className="button button-secondary" href={sample ? "/result?sample=1#step-2" : `/profile/manage?watchToken=${encodeURIComponent(token)}`}>AI推薦データを管理する <ArrowIcon /></Link></section>
        <section className="ai-info-next"><div><p className="overline">次にすること</p><h2>公開したあと、同じ質問で測り直す。</h2><p>AI回答に含まれた候補や参照元URLが変わったかを、前回と同じ条件で確認します。変更だけの前後差から因果は断定しません。</p></div><Link className="button button-primary" href={token ? `/watch?token=${encodeURIComponent(token)}` : "/watch?sample=1"}>変化を確認する <ArrowIcon /></Link></section>
      </>}
    </section>
    <footer className="site-footer"><div className="shell"><p className="footer-meta">Rovan / 公開情報から、比較される根拠を整える。</p></div></footer>
  </main>;
}
