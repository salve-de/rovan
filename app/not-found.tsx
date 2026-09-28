import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = { title: "ページが見つかりません", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <MarketingShell
      eyebrow="ページが見つかりません"
      title="お探しのページは、見つかりませんでした。"
      lead="URLが変わったか、ページが公開されていない可能性があります。"
      art={<Image src="/illustrations/owner-worried.svg" alt="" width={300} height={300} />}
      heroExtra={
        <div className="nf-actions">
          <Link className="button button-primary" href="/">ホームへ戻る</Link>
          <Link className="button button-secondary" href="/manage">管理用リンクで開く</Link>
        </div>
      }
    >
      <p className="nf-note">診断結果・公開ページ・週次見守りは、保存した「管理用リンク」から開けます。</p>
    </MarketingShell>
  );
}
