import { sellerReady } from "@/lib/legal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeWhyNow } from "@/components/home/HomeWhyNow";
import { HomeChange } from "@/components/home/HomeChange";
import { HomeBenefits } from "@/components/home/HomeBenefits";
import { HomeNoSite } from "@/components/home/HomeNoSite";
import { HomeSteps } from "@/components/home/HomeSteps";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeDiagnosis } from "@/components/home/HomeDiagnosis";

export default function HomePage() {
  return (
    <main className="home-page">
      <SiteHeader />
      <HomeHero />
      <HomeWhyNow />
      <HomeChange />
      <HomeBenefits />
      <HomeNoSite />
      <HomeSteps />
      <HomeFaq />
      <HomeDiagnosis />
      <SiteFooter showSellerLinks={sellerReady()} />
    </main>
  );
}
