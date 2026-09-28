import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ArrowIcon, CheckIcon } from "@/components/icons";
import { PageSection } from "@/components/page/page-section";
import { CtaBand } from "@/components/page/cta-band";
import { FaqList } from "@/components/page/faq-list";
import { WATCH_MONTHLY_PRICE_TAX_EXCLUSIVE_LABEL, WATCH_MONTHLY_PRICE_TAX_INCLUSIVE } from "@/lib/pricing";
import { FREE_PANEL_SIZE, CORE_PANEL_SIZE } from "@/lib/prompt-panels";

export const metadata: Metadata = {
  title: "料金プラン",
  description: "Rovanの無料AI推薦診断と、AI推薦・自動見守りプランの料金・提供範囲。",
};

const free = [
  "会社名・Instagram・ホームページのどれか1つで診断",
  `${FREE_PANEL_SIZE}問の質問を、実際にAIへ聞いて確認`,
  "名前が出た質問・出なかった質問が分かる",
  "ライバルがすすめられた理由が分かる",
];

const paid = [
  "AIが読める御社のページを、Rovan上に公開",
  `${CORE_PANEL_SIZE}問で、名前が出た割合を毎週測定`,
  "変化に合わせてページを自動で最新に（毎週の承認は不要）",
  "ホームページの改修・新しい開設は不要",
  "管理画面から、いつでも解約",
];

const steps = [
  { src: "/illustrations/asks-ai-laptop.svg", alt: "パソコンで診断結果を見る人", title: "無料で診断", body: "会社名やInstagramを入れるだけ。今の状態が分かります。" },
  { src: "/illustrations/owner-idea.svg", alt: "内容を確かめる社長", title: "内容を見て、OK", body: "公開する前に1回だけ確認。ここから14日間は無料です。" },
  { src: "/illustrations/owner-cheers.svg", alt: "報告を受け取って喜ぶ社長", title: "あとは毎週おまかせ", body: "AIに聞き直し、ページを最新に保って、結果をお知らせします。" },
];

const faqs = [
  { q: "無料期間のあと、勝手に料金がかかりますか？", a: "かかりません。最初の14日間が終わっても自動で課金されることはなく、始めない限り有料契約にはなりません。" },
  { q: "解約はいつでもできますか？", a: "はい。月単位の契約で、管理画面からいつでも解約の手続きができます。" },
  { q: "ホームページがなくても、同じ料金ですか？", a: "同じです。ホームページの有無で料金は変わりません。AIが読めるページはRovan上につくります。" },
  { q: "AIにすすめられることを保証しますか？", a: "保証はできません。そのかわり、毎週同じ質問でAIの答えを測り、よくなった・変わらない・下がったをそのままお見せします。" },
];

export default function PricingPage() {
  return (
    <MarketingShell
      layout="sections"
      eyebrow="料金"
      title={<>営業マンを雇う前に。<br />AIに選ばれる準備を、月1万円ほどで。</>}
      lead="1日あたり約330円。診断は無料で、続けるかどうかは結果を見てから決められます。"
      art={<Image src="/illustrations/owner-cheers.svg" alt="" width={360} height={360} priority />}
    >
      <PageSection tone="white" eyebrow="料金プラン" title="プランは、ひとつだけ。">
        <div className="pr-plans">
          <div className="pr-plan">
            <span className="pr-plan-name">無料診断</span>
            <strong className="pr-plan-price">0<small>円</small></strong>
            <span className="pr-plan-sub">まずは今の状態を確認</span>
            <ul>{free.map((item) => <li key={item}><CheckIcon />{item}</li>)}</ul>
            <Link className="button button-secondary pr-plan-button" href="/#start">まずは無料で診断する <ArrowIcon /></Link>
          </div>
          <div className="pr-plan pr-plan--main">
            <span className="pr-plan-flag">最初の14日間は無料</span>
            <span className="pr-plan-name">AI推薦・自動見守りプラン</span>
            <strong className="pr-plan-price">{WATCH_MONTHLY_PRICE_TAX_INCLUSIVE.toLocaleString()}<small>円／月（税込）</small></strong>
            <span className="pr-plan-sub">{WATCH_MONTHLY_PRICE_TAX_EXCLUSIVE_LABEL}・1日約330円</span>
            <ul>{paid.map((item) => <li key={item}><CheckIcon />{item}</li>)}</ul>
            <Link className="button button-primary pr-plan-button" href="/#start">無料診断から始める <ArrowIcon /></Link>
            <small className="pr-plan-note">無料期間が終わっても自動では課金されません。</small>
          </div>
        </div>
      </PageSection>

      <PageSection tone="tint" eyebrow="始め方" title="あなたがやるのは、最初の2回だけ。">
        <div className="home-benefits-grid">
          {steps.map((step, index) => (
            <div className="home-benefits-card" key={step.title}>
              <Image className="home-benefits-card-img" src={step.src} alt={step.alt} width={200} height={200} />
              <span className="home-benefits-card-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection tone="white" eyebrow="料金のよくある質問" title="お金のこと、先にお答えします。">
        <FaqList items={faqs} />
        <p className="pr-legal">本サービスは、決まった条件でAIの答えと公開情報を確かめ、整理するものです。AIの推薦・引用・検索順位・問い合わせ・契約・売上は保証しません。御社のサイトを自動で書きかえることもありません。</p>
      </PageSection>

      <PageSection tone="tint">
        <CtaBand />
      </PageSection>
    </MarketingShell>
  );
}
