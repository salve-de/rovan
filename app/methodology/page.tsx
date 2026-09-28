import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { PageSection } from "@/components/page/page-section";
import { CtaBand } from "@/components/page/cta-band";
import { CORE_PANEL_SIZE, FREE_PANEL_SIZE } from "@/lib/prompt-panels";

export const metadata: Metadata = {
  title: "調べ方・測定方法",
  description: "AIのおすすめ獲得に向けた測定方法。固定50問のAI顧客奪還シェア、欠損の扱い、同じ条件での前後比較を説明します。",
};

const steps = [
  { title: "お客さんの質問をつくる", body: "会社のサイトやInstagramから、買う前に聞かれそうな質問をつくります。" },
  { title: "3つのAIに、実際に聞く", body: "ChatGPT・Gemini・Perplexityに、同じ質問を同じ条件で聞きます。" },
  { title: "名前が出たかを数える", body: "答えに御社の名前が出たか、先に出た会社はどこか、どのページが参考にされたかを記録します。" },
];

const reading = [
  { term: "名前が出た割合", desc: "取得できた答えのうち、御社が候補として挙がった割合。お客さんの数や市場シェアではありません。" },
  { term: "答えの中の順番", desc: "答えに順番が書かれていた場合だけ表示します。順番のない答えを無理に順位にはしません。" },
  { term: "参考にされたページ", desc: "AIの答えに含まれていたURLです。Rovanのページが採用された・推薦されたという意味ではありません。" },
  { term: "取得できた割合", desc: "予定した答えのうち、実際に取得できた割合。取得できなかった分を「名前が出なかった」とは数えません。" },
];

export default function MethodologyPage() {
  return (
    <MarketingShell
      layout="sections"
      eyebrow="調べ方"
      title={<>同じ質問を、同じ条件で。<br />AIの答えを毎週くらべます。</>}
      lead="Rovanは、お客さんがAIに聞きそうな質問をつくり、答えに御社の名前が出たかを数えます。条件をそろえるので、前と今をそのまま比べられます。"
    >
      <PageSection tone="white" eyebrow="測り方" title="やっていることは、3つだけ。">
        <ol className="mt-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="mt-step-num">{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-panels">
          <div><span>無料診断</span><strong>{FREE_PANEL_SIZE}問</strong><p>使えるAIで1回確かめます。</p></div>
          <div><span>週次見守り（有料）</span><strong>{CORE_PANEL_SIZE}問</strong><p>同じ{CORE_PANEL_SIZE}問を毎週聞き直します。</p></div>
        </div>
      </PageSection>

      <PageSection tone="tint" eyebrow="北極星指標" title="AI顧客奪還シェア" lead={`固定${CORE_PANEL_SIZE}問のうち、御社がAIの候補に入った質問の割合です。AIごとに出します。`}>
        <div className="mt-formula" aria-label="計算式">
          <div><span>名前が出た質問</span><strong>14</strong></div>
          <b aria-hidden="true">÷</b>
          <div><span>答えを取得できた質問</span><strong>{CORE_PANEL_SIZE}</strong></div>
          <b aria-hidden="true">＝</b>
          <div className="mt-formula-result"><span>AI顧客奪還シェア</span><strong>28%</strong></div>
        </div>
        <p className="mt-formula-note">数字は見本です。実際のお客さんの数・市場シェア・売上ではありません。</p>
        <details className="mt-details">
          <summary>くわしいルールを見る</summary>
          <ul>
            <li>各AIに同じ質問を複数回聞き、すべて取得できた質問だけを使います。過半数で名前が出れば「候補入り」と判定し、同数は候補入りに数えません。</li>
            <li>取得できなかった質問がある場合は、成功した分母・予定の{CORE_PANEL_SIZE}問・未取得の数を並べて「部分観測」と表示します。分母が0なら計算しません。</li>
            <li>{FREE_PANEL_SIZE}問の無料診断の数字を、この指標として表示することはありません。無料から有料に移るときは、基準の測定を取り直します。</li>
            <li>前後の比較は、同じ対象・質問の版・AI・モデル・回数で、両方の時点で取得できた質問にそろえます。そろう質問がなければ「比較不可」とします。</li>
            <li>初回に名前が出なかった質問だけで計算する「候補回復率」は、別の補助の数字です。</li>
            <li>御社が候補に入っても、ライバルが外れた・1番目になったという意味ではありません。</li>
          </ul>
        </details>
      </PageSection>

      <PageSection tone="white" eyebrow="結果の読み方" title="画面の数字の意味">
        <dl className="mt-reading">
          {reading.map((item) => (
            <div key={item.term}><dt>{item.term}</dt><dd>{item.desc}</dd></div>
          ))}
        </dl>
      </PageSection>

      <PageSection tone="tint" eyebrow="注意" title="数字は、毎週変わることがあります。" lead="AIの答えは、検索結果・ライバルのサイト・AIのモデルの更新で変わります。Rovanは条件をそろえて測りますが、順位や売上を約束するものではありません。ページを直したあとの変化だけで、原因や売上への効果を決めつけることもしません。">
        <CtaBand />
      </PageSection>
    </MarketingShell>
  );
}
