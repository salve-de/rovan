import { seller } from "@/lib/legal";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon } from "@/components/icons";
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

function publicUrl(value: string) {
  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    return value;
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

  return (
    <main className="public-company-page">
      <header className="site-header site-header-compact">
        <div className="shell header-inner">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span><strong>Rovan</strong><small>AI推薦データの公開ページ</small></span>
          </Link>
          <Link className="text-button" href="/">
            まずは無料で診断してみる <ArrowIcon />
          </Link>
        </div>
      </header>

      <div className="ai-company-breadcrumb">
        <div className="shell ai-company-breadcrumb-inner">
          <div className="ai-company-breadcrumb-trail">
            <Link href="/">ホーム</Link>
            <span aria-hidden="true">/</span>
            <span>AI推薦データの公開ページ</span>
          </div>
          <span className="ai-company-breadcrumb-format">Schema.org 構造化データ・Markdown</span>
        </div>
      </div>

      <section className="public-company-hero ai-company-hero">
        <div className="shell">
          <div className="ai-company-hero-top">
            <div>
              <div className="ai-company-hero-badges">
                <Badge tone="success">AI推薦データの公開ページ</Badge>
                {sample ? <Badge tone="warn">見本</Badge> : null}
                <span className="ai-company-updated">最終更新：{dateLabel(profile.updatedAt)}</span>
              </div>
              <h1 className="ai-company-title">{profile.brandName}</h1>
              <p className="ai-company-summary">
                {profile.summary || `${sourceLabel}から確認できた内容を掲載しています。記載のない事項は補っていません。`}
              </p>
            </div>
            {!sourceTargetIsRovan && profile.targetUrl ? (
              <a href={profile.targetUrl} target="_blank" rel="noreferrer" className="button button-secondary ai-company-source-link">
                参照元サイトを開く ↗
              </a>
            ) : null}
          </div>

          <dl className="ai-company-meta">
            <div><dt>ページID</dt><dd className="ai-company-meta-mono">{profile.id}</dd></div>
            <div><dt>掲載内容</dt><dd>確認できた公開情報</dd></div>
            <div><dt>形式</dt><dd>HTML・JSON-LD・Markdown</dd></div>
          </dl>
        </div>
      </section>

      <section className="public-company-body shell ai-company-body">
        <div className="public-company-main">
          <section className="knowledge-section" aria-labelledby="public-facts-heading">
            <p className="overline">公開情報</p>
            <h2 id="public-facts-heading">確認できた情報</h2>
            <p className="section-lead-desc">{sourceLabel}で確認できる内容だけを掲載しています。資格・料金・実績など、記載のない事項は補っていません。</p>
            {facts.length ? (
              <div className="db-table-wrapper">
                <table className="dense-db-table">
                  <thead><tr><th scope="col">項目</th><th scope="col">内容</th><th scope="col">参照元</th></tr></thead>
                  <tbody>
                    {facts.map((fact, index) => (
                      <tr key={`${fact.label}-${index}`}>
                        <th scope="row">{fact.label}</th>
                        <td>{fact.value}</td>
                        <td>{fact.sourceUrl && !sourceTargetIsRovan ? <a href={fact.sourceUrl} target="_blank" rel="noreferrer">確認する ↗</a> : sourceTargetIsRovan ? "入力内容" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">現在、表示できる公開情報はありません。</p>
            )}
          </section>

          <section className="knowledge-section" aria-labelledby="about-page-heading">
            <p className="overline">このページについて</p>
            <h2 id="about-page-heading">公開情報参照ページの位置づけ</h2>
            <p className="section-lead-desc">AI推薦データは、会社の強み・対応条件・参照元をまとめた、AI向けの公開データです。本人確認や公的認証を示す公式台帳・公認推薦ではありません。{sourceTargetIsRovan ? "入力された内容を整理したページです。掲載内容の正確性・最新性は、公開前に入力者が確認してください。" : "Rovanが確認時点の参照元ページを整理したスナップショットです。情報の正確性・最新性は参照元サイトでご確認ください。"}</p>
            <ul className="ai-company-about-list">
              <li>{sourceTargetIsRovan ? "掲載内容は入力された情報に限ります。" : "掲載内容は参照元ページから確認できた情報に限ります。"}</li>
              <li>AIの回答・推薦・掲載順位・問い合わせ数・売上は保証しません。</li>
              <li>{seller.email ? "誤りや非公開のご希望は、ページ下部のお問い合わせ窓口からご連絡ください。" : "公開者は、保存した管理リンクから掲載を停止できます。"}</li>
            </ul>
          </section>
        </div>

        <aside className="public-company-aside">
          <div className="registry-card">
            <p className="overline">データ取得</p>
            <h2>機械可読データ</h2>
            <div className="endpoint-list">
              <a className="endpoint-link" href={`/ai/company/${encodeURIComponent(profile.slug)}.json${sample ? "?sample=1" : ""}`}>
                <div><strong>JSON-LD / JSON</strong><small>構造化データ</small></div><span>取得 ↗</span>
              </a>
              <a className="endpoint-link" href={`/ai/company/${encodeURIComponent(profile.slug)}.md${sample ? "?sample=1" : ""}`}>
                <div><strong>Markdown</strong><small>テキスト形式</small></div><span>取得 ↗</span>
              </a>
            </div>
          </div>

          <div className="registry-card">
            <p className="overline">{sourceTargetIsRovan ? "入力情報" : "参照元"}</p>
            <h2>{sourceTargetIsRovan ? "入力内容" : "確認元ページ"}</h2>
            {visibleSourcePages.length ? (
              <div className="source-list-dense">
                {visibleSourcePages.map((page) => (
                  <a key={page.url} href={page.url} target="_blank" rel="noreferrer">
                    <strong>{page.title}</strong>
                    {page.description ? <small>{page.description}</small> : null}
                    <span>{publicUrl(page.url)}</span>
                  </a>
                ))}
              </div>
            ) : <p className="empty-state">{sourceTargetIsRovan ? "外部の参照元ページはありません。入力された内容をもとに作成されたページです。" : "参照元ページは記録されていません。"}</p>}
          </div>
        </aside>
      </section>

      <footer className="public-company-footer">
        <div className="shell">
          <p>Rovan 公開情報参照ページ · 最終更新: {dateLabel(profile.updatedAt)}</p>
          {seller.email ? <p className="disclaimer-text ai-company-footer-disclaimer">
            【掲載照会・非公開申請】本ページは、{sourceTargetIsRovan ? "入力された内容を整理したページ" : "確認時点に参照元ページから整理した公開情報のスナップショット"}です。特定の生成AIによる回答・推薦・掲載順位、問い合わせ数、売上を保証するものではありません。掲載内容の確認・非公開（掲載停止）のご要望、最新情報への更新照会は{" "}
            <a href={seller.email ? `mailto:${seller.email}?subject=${encodeURIComponent(`【掲載照会・非公開申請】${profile.brandName}の公開情報参照ページについて`)}` : "/manage"}>
              お問い合わせ窓口{seller.email ? `（${seller.email}）` : ""}
            </a>
            {" "}までご連絡ください。
          </p> : <p><a href="/manage">公開者向けの管理・掲載停止</a></p>}
        </div>
      </footer>

      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}
    </main>
  );
}
