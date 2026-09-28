import { sellerReady } from "@/lib/legal";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function MarketingShell({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead: string; children: ReactNode }) {
  return <main className="document-page"><SiteHeader compact /><section className="document-hero"><div className="shell"><p className="overline">{eyebrow}</p><h1>{title}</h1><p>{lead}</p></div></section><section className="document-body shell">{children}</section><SiteFooter showSellerLinks={sellerReady()} /></main>;
}
