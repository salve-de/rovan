import Image from "next/image";
import { WATCH_MONTHLY_PRICE_TAX_INCLUSIVE } from "@/lib/pricing";

const BENEFITS = [
  {
    src: "/illustrations/asks-ai-laptop.svg",
    alt: "パソコンでAIに質問する人",
    number: "01",
    title: "AIが、御社のことを知る",
    body: "AIは、ネットで確かめられる情報から会社を選びます。Rovanが御社の強みを、AIが読める形で公開します。",
  },
  {
    src: "/illustrations/owner-idea.svg",
    alt: "強みをひらめく社長",
    number: "02",
    title: "大手と戦わずに、選ばれる",
    body: "「単品1個から」「夜も相談できる」など、御社だけの強みが活きる質問で名前を出しにいきます。",
  },
  {
    src: "/illustrations/owner-cheers.svg",
    alt: "結果に喜ぶ社長",
    number: "03",
    title: "手間なく、毎週よくしていく",
    body: "やるのは最初の2回だけ。あとは毎週AIに聞き直し、ページを最新に保って、結果をお知らせします。",
  },
];

export function HomeBenefits() {
  return (
    <section className="home-benefits">
      <div className="shell home-benefits-inner">
        <div className="home-benefits-head">
          <span className="home-benefits-eyebrow">なぜ、Rovanなのか</span>
          <h2>Rovanを使う、3つのメリット</h2>
        </div>

        <div className="home-benefits-grid">
          {BENEFITS.map((benefit) => (
            <div className="home-benefits-card" key={benefit.number}>
              <Image className="home-benefits-card-img" src={benefit.src} alt={benefit.alt} width={200} height={200} />
              <span className="home-benefits-card-number">{benefit.number}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </div>
          ))}
        </div>

        <div className="home-benefits-pricing">
          <span className="home-benefits-pricing-free">診断は無料</span>
          <span className="home-benefits-pricing-sep">｜</span>
          <span>続けるなら <b>月{WATCH_MONTHLY_PRICE_TAX_INCLUSIVE.toLocaleString("ja-JP")}円</b>（税込）</span>
          <span className="home-benefits-pricing-sep">｜</span>
          <span>最初の14日間は無料・自動で課金されません</span>
        </div>
      </div>
    </section>
  );
}
