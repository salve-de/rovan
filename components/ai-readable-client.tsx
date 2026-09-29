"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArrowIcon, CheckIcon } from "@/components/icons";
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
        if (!response.ok) throw new Error(data.error || "見守りの情報を読み込めませんでした。");
        setWatch(data);
      })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "見守りの情報を読み込めませんでした。"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sample, token]);

  if (loading) return <div className="full-loading" role="status">読み込んでいます。</div>;

  const draft = sample ? sampleAiReadable() : watch?.changePack?.aiReadable || null;
  const resolvedDomain = watch ? normalizeDomain(watch.latest.targetUrl) : domain;
  const backHref = sample ? "/watch?sample=1" : token ? `/watch?token=${encodeURIComponent(token)}` : "/manage";

  return <main className="pg-page ai-info-page">
    <SiteHeader compact />
    <section className="pg-hero ai-info-hero"><div className="shell pg-hero-inner"><Link className="text-button ai-info-back" href={backHref}>← 戻る</Link>{watch || sample ? <span className="pg-eyebrow">{resolvedDomain}</span> : null}<h1>AIが読みやすいファイル</h1></div></section>

    <section className="document-body shell ai-info-body">
      {error ? <div className="document-callout ai-info-error"><strong>表示できませんでした。</strong><p>{error}</p></div> : null}
      {!draft ? <section className="ai-info-empty"><h2>まだありません。</h2><Link className="button button-primary" href={backHref}>{token || sample ? "見守りに戻る" : "管理画面を開く"} <ArrowIcon /></Link></section> : <>
        <div className="ai-info-source"><div><h2>ファイルの中身</h2><p>{draft.sourcePages.length}ページから作りました。</p></div>{sample ? <span>見本</span> : null}</div>
        <div className="ai-info-grid">
          <section className="ai-info-panel"><header><div><h3>もとにしたページ</h3></div><span>{draft.sourcePages.length}ページ</span></header><ul className="ai-info-page-list">{draft.sourcePages.map((page) => <li key={page.url}><strong>{page.title}</strong>{page.description ? <span>{page.description}</span> : null}<small>{page.url}</small></li>)}</ul></section>
          <section className="ai-info-panel"><header><div><h3>ダウンロード</h3></div></header><div className="ai-info-downloads"><button className="button button-secondary" type="button" onClick={() => downloadText(`${draft.suggestedFileName}.txt`, draft.llmsTxt, "text/plain;charset=utf-8")}>テキスト（llms.txt） <ArrowIcon /></button><button className="button button-secondary" type="button" onClick={() => downloadText(`${draft.suggestedFileName}.jsonld`, draft.jsonLd, "application/ld+json;charset=utf-8")}>構造化データ（JSON-LD） <ArrowIcon /></button></div><details className="ai-info-code"><summary>中身を見る</summary><pre>{draft.llmsTxt}</pre></details></section>
        </div>
        <section className="ai-info-review"><div><h2>公開する前に確かめること</h2></div><ul>{draft.publishChecks.map((check) => <li key={check}><CheckIcon />{check}</li>)}</ul><Link className="button button-secondary" href={sample ? "/result?sample=1#step-2" : `/profile/manage?watchToken=${encodeURIComponent(token)}`}>公開ページを管理する <ArrowIcon /></Link></section>
        <section className="ai-info-next"><div><h2>公開したあとも、毎週同じ質問で測ります。</h2></div><Link className="button button-primary" href={token ? `/watch?token=${encodeURIComponent(token)}` : "/watch?sample=1"}>見守りを見る <ArrowIcon /></Link></section>
      </>}
    </section>
    <SiteFooter />
  </main>;
}
