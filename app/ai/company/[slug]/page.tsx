import { seller } from "@/lib/legal";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon } from "@/components/icons";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui";
import { toPublicProfile } from "@/lib/public-profile";
import { displayFactLabel, displaySummary } from "@/lib/profile-display";
import { getActivePublicProfileBySlug } from "@/lib/storage";
import type { PublicProfile } from "@/lib/types";
import { siteUrl } from "@/lib/site";
import { getSampleProfile } from "@/lib/sample-profiles";
import { demoMode } from "@/lib/demo-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ sample?: string | string[] }>;
};

function isSampleRequest(value: string | string[] | undefined) {
  return value === "1" || (Array.isArray(value) && value.includes("1"));
}

/**
 * Resolve only an explicitly stored public profile or an explicitly named
 * design fixture. Unknown slugs must not be converted into another company,
 * a keyword-derived profile, or a generated company page.
 */
async function profileFor(slug: string, sample = false): Promise<PublicProfile | null> {
  if (sample) return getSampleProfile(slug);

  const record = await getActivePublicProfileBySlug(slug);
  return record ? toPublicProfile(record) : null;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

function isRovanProfileUrl(value: string) {
  try {
    return new URL(value, siteUrl).pathname.startsWith("/ai/company/");
  } catch {
    return false;
  }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const sample = isSampleRequest(query.sample);
  const profile = await profileFor(decodeURIComponent(slug), sample);

  if (!profile) return { title: "公開ページが見つかりません", robots: { index: false, follow: false } };

  const description = displaySummary(profile.summary) || [profile.brandName, profile.market].filter(Boolean).join("｜");
  const dataPath = (ext: "json" | "md") => `${siteUrl}/ai/company/${encodeURIComponent(profile.slug)}.${ext}${sample ? "?sample=1" : ""}`;
  return {
    title: sample ? `${profile.brandName}（見本）` : profile.title,
    description,
    // 機械向けのデータは画面に出さず、head の alternate で知らせる
    alternates: { canonical: `${siteUrl}/ai/company/${encodeURIComponent(profile.slug)}`, types: { "application/ld+json": dataPath("json"), "text/markdown": dataPath("md") } },
    robots: sample ? { index: false, follow: false, noarchive: true } : { index: true, follow: true, noarchive: true },
  };
}

export default async function PublicCompanyPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const sample = isSampleRequest(query.sample);
  const profile = await profileFor(decodeURIComponent(slug), sample);
  if (!profile) notFound();

  const sourcePages = profile.sourcePages || [];
  const facts = profile.facts || [];
  const jsonLd = profile.structuredData.trim();
  // 社名だけで作ったページ（元になるホームページがない）かどうか
  const direct = isRovanProfileUrl(profile.targetUrl);
  const visibleSourcePages = sourcePages.filter((page) => !isRovanProfileUrl(page.url));
  // 見本は「見本」バッジで示すため、重複する「掲載区分：見本」の行は画面に出さない（JSON・Markdownには残す）
  const visibleFacts = sample ? facts.filter((fact) => fact.label !== "掲載区分") : facts;
  const summary = displaySummary(profile.summary);
  const sourceName = visibleSourcePages[0]?.title || "ホームページ";
  const correctionHref = seller.email ? `mailto:${seller.email}?subject=${encodeURIComponent(`${profile.brandName}のページの訂正・削除`)}` : "/manage";

  return (
    <main className="pp-page">
      <header className="pp-header">
        <div className="shell pp-header-inner">
          <Brand />
          <Link className="pp-header-link" href="/">Rovanについて <ArrowIcon /></Link>
        </div>
      </header>
      {!sample && demoMode() ? (
        <div className="rp-demo-banner" role="status">
          <div className="shell"><strong>デモ表示です。</strong>実際には公開されていません。</div>
        </div>
      ) : null}

      <section className="pp-hero">
        <div className="shell pp-hero-inner">
          {sample ? <div className="pp-hero-badges"><Badge tone="warn">見本</Badge></div> : null}
          <h1 className="pp-title">{profile.brandName}</h1>
          {profile.market ? <p className="pp-market">{profile.market}</p> : null}
          {summary ? <p className="pp-summary">{summary}</p> : null}
          <div className="pp-hero-foot">
            <span>{dateLabel(profile.updatedAt)}時点の情報</span>
            <span>{direct ? `${profile.brandName}から提供された情報です` : `情報のもと：${sourceName}`}</span>
            {!direct && profile.targetUrl ? (
              <a href={profile.targetUrl} target="_blank" rel="noreferrer" className="pp-hero-source">元のページを見る ↗</a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="shell pp-body">
        <div className="pp-main">
          <section aria-labelledby="pp-facts-heading">
            <h2 id="pp-facts-heading" className="pp-heading">基本情報</h2>
            {visibleFacts.length ? (
              <dl className="pp-facts">
                {visibleFacts.map((fact, index) => (
                  <div className="pp-fact" key={`${fact.label}-${index}`}>
                    <dt>{displayFactLabel(fact.label)}</dt>
                    <dd>
                      <span>{fact.value}</span>
                      {fact.sourceUrl && !direct && !isRovanProfileUrl(fact.sourceUrl) ? <a className="pp-fact-source" href={fact.sourceUrl} target="_blank" rel="noreferrer">出典 ↗</a> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="empty-state">まだ情報がありません。</p>
            )}
          </section>

          {profile.targetCustomers.length || profile.useCases.length ? (
            <section className="pp-fit" aria-label="こんな方・こんな時に">
              {profile.targetCustomers.length ? (
                <div className="pp-fit-card">
                  <h2 className="pp-subheading">こんな方に</h2>
                  <ul>{profile.targetCustomers.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
              {profile.useCases.length ? (
                <div className="pp-fit-card">
                  <h2 className="pp-subheading">こんな時に</h2>
                  <ul>{profile.useCases.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        {visibleSourcePages.length ? (
          <aside className="pp-aside">
            <section className="pp-aside-card" aria-labelledby="pp-source-heading">
              <h2 id="pp-source-heading" className="pp-subheading">情報のもと</h2>
              <ul className="pp-source-list">
                {visibleSourcePages.map((page) => (
                  <li key={page.url}>
                    <a href={page.url} target="_blank" rel="noreferrer">{page.title} ↗</a>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        ) : null}
      </div>

      <footer className="pp-footer">
        <div className="shell pp-footer-inner">
          <p>このページはRovanがつくっています。© 2026 Rovan</p>
          <a className="pp-about-link" href={correctionHref}>訂正・削除のご依頼</a>
        </div>
      </footer>

      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}
    </main>
  );
}
