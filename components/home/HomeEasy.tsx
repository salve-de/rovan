import Image from "next/image";
import { WATCH_MONTHLY_PRICE_TAX_INCLUSIVE } from "@/lib/pricing";

// 安心して始められることを1か所で伝える（手間・ホームページなしOK・料金）。
// 勝ち：「これなら自分でもできる」「勝手に課金されない」と感じて診断に進む。負け：「面倒そう」「うちには関係ない」「高い」。
const STEPS = [
  { title: "店名・Instagram・URLのどれかを入れる", note: "診断は無料・登録不要" },
  { title: "内容を見て、OKを押す", note: "ここから14日間は無料" },
  { title: "あとは毎週おまかせ", note: "報告が届くだけ" },
];

export function HomeEasy() {
  return (
    <section className="home-easy">
      <div className="shell home-easy-inner">
        <div className="home-section-head">
          <span className="home-section-eyebrow">始め方</span>
          <h2>あなたがやるのは、たったこれだけ。</h2>
          <p>ホームページがなくても大丈夫。あとはRovanが、毎週続けます。</p>
        </div>

        <div className="home-easy-grid">
          <ol className="home-easy-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="home-easy-num">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.note}</span>
                </div>
              </li>
            ))}
          </ol>

          <figure className="home-easy-phone">
            <div className="home-phone">
              <div className="home-phone-screen">
                <Image src="/screens/public-page-phone.png" alt="Rovanがつくる公開ページの実際の画面（見本の青葉ベーカリー）" width={430} height={1180} sizes="280px" />
              </div>
            </div>
            <figcaption>Instagramだけのパン屋さんでも、このページをRovanがつくります<br /><small>実際の画面（見本のお店）</small></figcaption>
          </figure>
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
