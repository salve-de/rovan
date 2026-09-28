import { seller } from "@/lib/legal";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon } from "@/components/icons";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui";
import { toPublicProfile } from "@/lib/public-profile";
import { getActivePublicProfileBySlug } from "@/lib/storage";
import type { PublicProfile } from "@/lib/types";
import { siteUrl } from "@/lib/site";
import { getSampleProfile } from "@/lib/sample-profiles";

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

  const description = profile.summary || `${profile.brandName}の公開情報を確認できます。`;
  return {
    title: sample ? `${profile.brandName} AI推薦データ（見本）` : profile.title,
    description,
    alternates: { canonical: `${siteUrl}/ai/company/${encodeURIComponent(profile.slug)}` },
    robots: sample ? { index: false, follow: false, noarchive: true } : { index: true, follow: true, noarchive: true },
    openGraph: { title: profile.title, description, type: "article" },
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
  const sourceTargetIsRovan = isRovanProfileUrl(profile.targetUrl);
  const sourceLabel = sourceTargetIsRovan ? "入力情報" : "参照元ページ";
  const visibleSourcePages = sourcePages.filter((page) => !isRovanProfileUrl(page.url));

  // 見本は「見本」バッジで示すため、重複する「掲載区分：見本」の行は画面に出さない（JSON・Markdownには残す）
  const visibleFacts = sample ? facts.filter((fact) => fact.label !== "掲載区分") : facts;
  const sourceName = sourceTargetIsRovan ? "入力された情報" : visibleSourcePages[0]?.title || "参照元ページ";
  const dataHref = (ext: "json" | "md") => `/ai/company/${encodeURIComponent(profile.slug)}.${ext}${sample ? "?sample=1" : ""}`;

  return (
    <main className="pp-page">
      <header className="pp-header">
        <div className="shell pp-header-inner">
          <Brand />
          <Link className="pp-header-link" href="/">Rovanについて <ArrowIcon /></Link>
        </div>
      </header>

      <section className="pp-hero">
        <div className="shell pp-hero-inner">
          <div className="pp-hero-badges">
            <Badge tone="success">公開情報ページ</Badge>
            {sample ? <Badge tone="warn">見本</Badge> : null}
          </div>
          <h1 className="pp-title">{profile.brandName}</h1>
          {profile.market ? <p className="pp-market">{profile.market}</p> : null}
          <p className="pp-summary">
            {profile.summary || `${sourceLabel}から確認できた内容を掲載しています。記載のない事項は補っていません。`}
          </p>
          <div className="pp-hero-foot">
            <span>最終確認：{dateLabel(profile.updatedAt)}</span>
            <span>情報のもと：{sourceName}</span>
            {!sourceTargetIsRovan && profile.targetUrl ? (
              <a href={profile.targetUrl} target="_blank" rel="noreferrer" className="pp-hero-source">元のページを見る ↗</a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="shell pp-body">
        <div className="pp-main">
          <section aria-labelledby="pp-facts-heading">
            <h2 id="pp-facts-heading" className="pp-heading">確認できた情報</h2>
            <p className="pp-lead">{sourceLabel}で確認できた内容だけを載せています。書かれていないことは補っていません。</p>
            {visibleFacts.length ? (
              <dl className="pp-facts">
                {visibleFacts.map((fact, index) => (
                  <div className="pp-fact" key={`${fact.label}-${index}`}>
                    <dt>{fact.label}</dt>
                    <dd>
                      <span>{fact.value}</span>
                      {fact.sourceUrl && !sourceTargetIsRovan ? <a className="pp-fact-source" href={fact.sourceUrl} target="_blank" rel="noreferrer">出典 ↗</a> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="empty-state">現在、表示できる公開情報はありません。</p>
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

        <aside className="pp-aside">
          <section className="pp-aside-card" aria-labelledby="pp-source-heading">
            <h2 id="pp-source-heading" className="pp-subheading">{sourceTargetIsRovan ? "入力内容" : "情報のもと"}</h2>
            {visibleSourcePages.length ? (
              <ul className="pp-source-list">
                {visibleSourcePages.map((page) => (
                  <li key={page.url}>
                    <a href={page.url} target="_blank" rel="noreferrer">{page.title} ↗</a>
                    {page.description ? <small>{page.description}</small> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="pp-note">{sourceTargetIsRovan ? "外部の参照元ページはありません。入力された内容をもとに作成されたページです。" : "参照元ページは記録されていません。"}</p>}
          </section>

          <section className="pp-aside-card" aria-labelledby="pp-about-heading">
            <h2 id="pp-about-heading" className="pp-subheading">このページについて</h2>
            <ul className="pp-about-list">
              <li>{sourceTargetIsRovan ? "入力された情報を、AIが読みやすい形に整理したページです。" : "公開されている情報を、確認した時点で整理したページです。最新の内容は元のページでご確認ください。"}</li>
              <li>本人確認や公的な認証を示す公式台帳・公認推薦ではありません。</li>
              <li>AIの回答・推薦・順位・問い合わせ・売上は保証しません。</li>
            </ul>
            {seller.email ? (
              <a className="pp-about-link" href={`mailto:${seller.email}?subject=${encodeURIComponent(`【掲載照会・非公開申請】${profile.brandName}の公開情報ページについて`)}`}>訂正・非公開のご依頼 ↗</a>
            ) : (
              <Link className="pp-about-link" href="/manage">公開者の方：訂正・掲載停止はこちら</Link>
            )}
          </section>

          <p className="pp-data-links">
            AI・システム向けデータ：
            <a href={dataHref("json")}>JSON-LD</a>
            <a href={dataHref("md")}>Markdown</a>
          </p>
        </aside>
      </div>

      <footer className="pp-footer">
        <div className="shell">
          <p>© 2026 Rovan　{profile.brandName}の公開情報ページ・最終確認 {dateLabel(profile.updatedAt)}</p>
        </div>
      </footer>

      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}
    </main>
  );
}
