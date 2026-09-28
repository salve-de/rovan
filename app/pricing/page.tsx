import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ArrowIcon, CheckIcon } from "@/components/icons";
import { WATCH_MONTHLY_PRICE_LABEL, WATCH_MONTHLY_PRICE_TAX_EXCLUSIVE_LABEL, WATCH_MONTHLY_PRICE_TAX_INCLUSIVE } from "@/lib/pricing";
import { FREE_PANEL_SIZE, CORE_PANEL_SIZE } from "@/lib/prompt-panels";

export const metadata: Metadata = {
  title: "料金プラン",
  description: "Rovanの無料AI推薦診断と、AI推薦・自動見守りプランの料金・提供範囲。",
};

const free = [
  "社名またはURL 1件の初回診断",
  `固定${FREE_PANEL_SIZE}問の購入検討向け質問パネルで、複数のAIに実際に質問`,
  "AI回答に自社が含まれた質問・含まれなかった質問の確認",
  "大手ライバルが推薦された回答と、その根拠の確認",
  "そのまま使える完成文案付きのAI推薦データ（自動下書き）",
];

const paid = [
  "最初の14日間は無料。期間終了後に自動で課金されることはありません",
  "1日約330円（税別9,800円 / 税込10,780円）",
  "自社サイトの改修不要・サイトをお持ちでない場合も新たな開設不要（お客様のサイトやCMSは変更しません）",
  `固定${CORE_PANEL_SIZE}問のパネルで、自社が推薦候補に入った割合（AI顧客奪還シェア）を毎週追跡`,
  "AIの回答傾向や競合の変化に合わせ、Rovan上の公開データを自動調整（毎週の承認は不要）",
  "月単位で利用でき、管理画面からいつでも解約可能",
];

export default function PricingPage() {
  return <MarketingShell
    eyebrow="料金プラン"
    title="営業マンを雇う前に。1日約330円で、AI推薦の獲得と維持を自動化。"
    lead="専門知識も、事前の準備も必要ありません。社名や店名を入力し、内容を確認して公開に同意するだけ。ChatGPTなどのAIが御社をおすすめするための公開ページを整え、毎週の推薦状況を自動で追跡します。"
  >
    <div className="pricing-compare" aria-label="料金比較">
      <div className="pricing-plan pricing-free">
        <header>
          <p>無料診断</p>
          <strong>¥0</strong>
          <span>まずはAI回答の現状を確認</span>
        </header>
        <ul>{free.map((item) => <li key={item}><CheckIcon />{item}</li>)}</ul>
        <Link className="button button-secondary" href="/#scan">まずは無料で診断する <ArrowIcon /></Link>
      </div>
      <div className="pricing-plan pricing-paid">
        <header>
          <p>AI推薦・自動見守りプラン</p>
          <strong>¥{WATCH_MONTHLY_PRICE_TAX_INCLUSIVE.toLocaleString()} <small>/月・税込</small></strong>
          <span>{WATCH_MONTHLY_PRICE_TAX_EXCLUSIVE_LABEL}</span>
        </header>
        <ul>{paid.map((item) => <li key={item}><CheckIcon />{item}</li>)}</ul>
        <Link className="button button-primary" href="/#scan">無料診断から始める <ArrowIcon /></Link>
        <small className="pricing-plan-note">無料診断後、料金を確認してから開始します。開始しない限り有料契約にはなりません。</small>
      </div>
    </div>
    <div className="pricing-value-strip" aria-label="サービスで確認できること">
      <article>
        <small>現在</small>
        <strong>推薦候補に入れているかを診断</strong>
        <span>指定した質問とAI回答を記録し、自社が候補に含まれたか、どのURLが参照されたかを確認します。</span>
      </article>
      <article>
        <small>整理</small>
        <strong>専門性で選ばれる理由を伝える</strong>
        <span>公開情報で確認できた専門分野・対応条件を参照元付きの下書きへ。一から文章を作る手間を抑えます。</span>
      </article>
      <article>
        <small>継続</small>
        <strong>推薦獲得への変化を毎週追う</strong>
        <span>同じ質問・AI・条件で、自社が候補に入ったかを比較。次に見直す情報を探します。結果は将来の推薦や売上を保証しません。</span>
      </article>
    </div>

    <section className="pricing-explanation">
      <h2>無料診断と週次測定の違い</h2>
      <p>
        無料診断では、指定した質問・AI・日時の条件で、AI回答と参照URLを確認します。<br />
        有料プランでは、同じ測定条件を毎週記録し、前回との差分を確認できます。料金は{WATCH_MONTHLY_PRICE_LABEL}です。<br />
        Rovanは営業活動の代行サービスではなく、AIの推薦や回答を保証するサービスでもありません。
      </p>
      <div className="pricing-steps">
        <div><strong>1</strong><span>URL・社名を入力</span><p>公開情報をもとに初回診断</p></div>
        <div><strong>2</strong><span>AI推薦データを配備</span><p>内容を確認してから公開</p></div>
        <div><strong>3</strong><span>毎週のAI回答を自動見守り</span><p>同じ条件で前回との差分を確認</p></div>
      </div>
    </section>
    <section className="pricing-note">
      <h2>ご契約について</h2>
      <p>無料診断を利用しただけで有料課金は発生しません。継続測定を開始するときに料金と更新条件を確認し、Stripe Customer Portalから解約手続きを行えます。</p>
      <p>本サービスは、指定した条件でのAI回答と公開情報を確認・整理するものです。AIの推薦、引用、検索順位、問い合わせ、契約、売上は保証しません。対象会社のサイトを自動変更することもありません。</p>
    </section>
  </MarketingShell>;
}
