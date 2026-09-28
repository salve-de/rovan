import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { MarketingShell } from "@/components/marketing-shell";
import { PageSection } from "@/components/page/page-section";

export const metadata: Metadata = {
  title: "パートナー制度",
  description: "Web制作会社・士業・コンサルタント向けに、Rovanの現在の提供範囲とパートナー制度の準備状況を案内します。",
};

const offers = [
  { src: "/illustrations/asks-ai-laptop.svg", title: "顧客の今を、無料で見せられる", body: "会社名を入れるだけで、AIの答えに顧客の名前が出ているかを確かめられます。" },
  { src: "/illustrations/owner-idea.svg", title: "サイトを触らずに、強みを伝えられる", body: "顧客のサイトやCMSは変更しません。出典つきの公開ページをRovan上につくります。" },
  { src: "/illustrations/owner-cheers.svg", title: "毎週の変化を、同じ条件で追える", body: "同じ質問で毎週測り、よくなった・変わらない・下がったをそのまま報告します。" },
];

export default function PartnersPage() {
  return (
    <MarketingShell
      layout="sections"
      eyebrow="Web制作会社・士業・コンサルタントの方へ"
      title={<>顧客の専門性を、<br />AIに選ばれる理由へ。</>}
      lead="Rovanは、顧客のニッチな強みをAIに伝え、その変化を毎週測るサービスです。パートナー制度（紹介料・割引）は準備中で、いまは始まっていません。"
      art={<Image src="/illustrations/owner-idea.svg" alt="" width={360} height={360} priority />}
    >
      <PageSection tone="white" eyebrow="いま使えること" title="顧客に、すぐ案内できる3つのこと">
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

      <PageSection tone="tint" eyebrow="制度の状況" title="パートナー制度は、準備中です。" lead="紹介料・割引・招待コード・パートナー専用の管理画面は、まだ提供していません。始まるときは、このページで条件をお知らせします。">
        <div className="pa-actions">
          <Link className="button button-primary" href="/result?sample=1">診断結果の見本を見る <ArrowIcon /></Link>
          <Link className="button button-secondary" href="/methodology">測り方を見る</Link>
          <Link className="button button-secondary" href="/pricing">料金を見る</Link>
        </div>
      </PageSection>
    </MarketingShell>
  );
}
