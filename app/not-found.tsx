import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = { title: "ページが見つかりません", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <MarketingShell
      title="ページが見つかりません"
      art={<Image src="/illustrations/owner-worried.svg" alt="" width={300} height={300} />}
      heroExtra={
        <div className="nf-actions">
          <Link className="button button-primary" href="/">ホームへ</Link>
          <Link className="button button-secondary" href="/manage">管理用リンクで開く</Link>
        </div>
      }
      layout="sections"
    >
      {null}
    </MarketingShell>
  );
}
