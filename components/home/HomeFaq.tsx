import { WATCH_MONTHLY_PRICE_LABEL } from "@/lib/pricing";

const FAQS = [
  {
    q: "本当に、AIにすすめてもらえるようになりますか？",
    a: "AIの答えを約束することはできません。そのかわり、AIが御社を知るための材料をそろえ、毎週同じ質問で結果を測って、変化をそのままお見せします。",
  },
  {
    q: "ホームページがなくても使えますか？",
    a: "使えます。Instagramのアカウントや店名だけでも始められます。AIが読めるページはRovan上につくります。",
  },
  {
    q: "自社のホームページを書きかえられませんか？",
    a: "書きかえません。御社のサイトやSNSには一切さわらず、Rovan上のページだけを整えます。",
  },
  {
    q: "費用はかかりますか？ いつでもやめられますか？",
    a: `診断は無料です。続ける場合は${WATCH_MONTHLY_PRICE_LABEL}で、最初の14日間は無料・自動で課金されません。解約は管理画面からいつでもできます。`,
  },
  {
    q: "公開される内容は、確認できますか？",
    a: "はい。公開の前に必ず内容をお見せします。公開後も、訂正や非公開はいつでもできます。",
  },
  {
    q: "どのAIに対応していますか？",
    a: "ChatGPT・Gemini・Perplexityの3つです。お客さんが実際に使っているAIで、同じ質問を確かめます。",
  },
];

export function HomeFaq() {
  return (
    <section id="faq" className="home-faq">
      <div className="shell home-faq-inner">
        <div className="home-faq-head">
          <span className="home-faq-eyebrow">よくある質問</span>
          <h2>始める前の、よくある疑問</h2>
        </div>

        <div className="home-faq-grid">
          {FAQS.map((faq) => (
            <div className="home-faq-card" key={faq.q}>
              <span className="home-faq-q"><b>Q</b>{faq.q}</span>
              <span className="home-faq-a">{faq.a}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
