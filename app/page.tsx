import { sellerReady } from "@/lib/legal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeWhyNow } from "@/components/home/HomeWhyNow";
import { HomeChange } from "@/components/home/HomeChange";
import { HomeDiagnosis } from "@/components/home/HomeDiagnosis";
import { HomeEasy } from "@/components/home/HomeEasy";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeFinalCta } from "@/components/home/HomeFinalCta";

// 流れ（docs/CONVERSION_DESIGN.md）：自分ごと化＋すぐ診断 → ヒヤッ（データ） → 希望（何がどう変わるか）
// → 無料診断で分かること（実際の画面）＋診断 → 安心（手間・HPなし・料金） → 不安つぶし（FAQ） → 最後の診断
export default function HomePage() {
  return (
    <main className="home-page">
      <SiteHeader />
      <HomeHero />
      <HomeWhyNow />
      <HomeChange />
      <HomeDiagnosis />
      <HomeEasy />
      <HomeFaq />
      <HomeFinalCta />
      <SiteFooter showSellerLinks={sellerReady()} />
    </main>
  );
}
