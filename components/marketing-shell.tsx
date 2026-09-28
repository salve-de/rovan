import { sellerReady } from "@/lib/legal";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * 公開ページ共通の外枠。ホームと同じ「小見出し＋大見出し＋一文」のヒーローを持つ。
 * layout="document" は規約などの読み物（本文を読みやすい幅・文字サイズで表示）、
 * layout="sections" は PageSection を並べるLP型のページ。
 */
export function MarketingShell({
  eyebrow,
  title,
  lead,
  art,
  heroExtra,
  layout = "document",
  compact = false,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  art?: ReactNode;
  heroExtra?: ReactNode;
  layout?: "document" | "sections";
  /** ログイン・管理など作業するページ。見出しを小さくし、入力欄を最初の画面に入れる */
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="pg-page">
      <SiteHeader compact />
      <section className={`pg-hero${compact ? " pg-hero--compact" : ""}`}>
        <div className={`shell pg-hero-inner${art ? " pg-hero-inner--art" : ""}`}>
          <div className="pg-hero-copy">
            <span className="pg-eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            {lead ? <p className="pg-hero-lead">{lead}</p> : null}
            {heroExtra}
          </div>
          {art ? <div className="pg-hero-art" aria-hidden="true">{art}</div> : null}
        </div>
      </section>
      {layout === "document" ? <section className="shell pg-doc document-body">{children}</section> : children}
      <SiteFooter showSellerLinks={sellerReady()} />
    </main>
  );
}
