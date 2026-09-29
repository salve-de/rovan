import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { MarketingShell } from "@/components/marketing-shell";
import { PageSection } from "@/components/page/page-section";

export const metadata: Metadata = {
  title: "パートナー制度",
  description: "Web制作会社・士業・コンサルタントの方へ。お客さまのAIでの見え方を、無料で調べられます。",
};

const offers = [
  { src: "/illustrations/asks-ai-laptop.svg", title: "今の状態を、無料で見せられる", body: "社名を入れるだけで、AIの答えにお客さまの名前が出ているかが分かります。" },
  { src: "/illustrations/owner-idea.svg", title: "サイトを触らずに、強みを伝えられる", body: "お客さまのサイトはそのまま。AIが読めるページをRovanの中につくります。" },
  { src: "/illustrations/owner-cheers.svg", title: "毎週の変化を追える", body: "同じ質問で毎週測り、上がった・変わらない・下がったをそのままお知らせします。" },
];

export default function PartnersPage() {
  return (
    <MarketingShell
      layout="sections"
      title={<>Web制作会社・士業・<br />コンサルタントの方へ</>}
      art={<Image src="/illustrations/owner-idea.svg" alt="" width={360} height={360} priority />}
    >
      <PageSection tone="white" title="お客さまに、すぐ使えること">
        <div className="home-benefits-grid">
          {offers.map((offer, index) => (
            <div className="home-benefits-card" key={offer.title}>
              <Image className="home-benefits-card-img" src={offer.src} alt="" width={200} height={200} />
              <span className="home-benefits-card-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{offer.title}</h3>
              <p>{offer.body}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection tone="tint" title="紹介制度（紹介料・割引）は準備中です">
        <div className="pa-actions">
          <Link className="button button-primary" href="/result?sample=1">診断結果の見本を見る <ArrowIcon /></Link>
          <Link className="button button-secondary" href="/methodology">調べ方を見る</Link>
          <Link className="button button-secondary" href="/pricing">料金を見る</Link>
        </div>
      </PageSection>
    </MarketingShell>
  );
}
