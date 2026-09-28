import { sellerReady } from "@/lib/legal";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "パートナー制度",
  description: "Web制作会社・士業・コンサルタント向けに、Rovanの現在の提供範囲を案内します。",
};

export default function PartnersPage() {
  return (
    <div className="page-shell">
      <SiteHeader />

      <main className="partners-main">
        {/* ヒーローセクション */}
        <section className="partners-hero">
          <div className="shell">
            <span className="overline">Web制作会社・士業・コンサルタント向け</span>
            <h1>
              顧客の専門性を、AIに選ばれる理由へ。<br />
              Rovanパートナー制度。
            </h1>
            <p className="partners-lead">
              自社サイトを改修せず、顧客のニッチな強みを伝える情報補強とAI回答の継続測定を支援します。
              紹介・パートナー制度は廃止ではなく、受付・報酬管理の実装を復旧するまで開始待ちです。
              現時点では紹介報酬の発生や割引適用は行いません。
            </p>

            <div className="partners-cta-row">
              <a href="#partner-apply" className="button button-primary">
                現在の提供範囲を見る <ArrowIcon />
              </a>
              <Link href="/result?sample=1" className="button button-secondary">
                診断の見本を見る
              </Link>
            </div>
          </div>
        </section>

        {/* パートナーが説明しやすい情報 */}
        <Section
          className="partners-benefits"
          eyebrow="現在、説明できる範囲"
          title="現在、説明できるサービスの範囲"
          lead="結果の条件・参照元・未確認事項を分けて示し、顧客と同じ情報を確認できる状態をつくります。"
        >
          <div className="benefits-grid">
            <Card className="benefit-card">
              <div className="benefit-card-badge">測定条件</div>
              <h3>質問・AI・日時を記録</h3>
              <p>どの質問、どのAI、いつの観測かを表示します。観測結果を全利用者に共通する順位や売上の指標として扱いません。</p>
            </Card>

            <Card className="benefit-card">
              <div className="benefit-card-badge">参照元</div>
              <h3>回答と公開情報を分けて確認</h3>
              <p>AI回答に含まれた参照URLと、対象サイトから確認できた事実を別々に確認できます。根拠のない補足は表示しません。</p>
            </Card>

            <Card className="benefit-card">
              <div className="benefit-card-badge">公開前確認</div>
              <h3>整理案は確認してから公開</h3>
              <p>公開情報の整理案は下書きとして扱い、事実と参照元を確認してから公開します。対象サイトを自動変更しません。</p>
            </Card>
          </div>
        </Section>

        {/* 現在の提供範囲 */}
        <section className="partners-mechanism shell">
          <div className="mechanism-card">
            <div className="mechanism-text">
              <span className="mechanism-tag">現在の提供範囲</span>
              <h2>制度の開始に向けて復旧中です</h2>
              <p>
                現時点では、紹介料、割引、専用招待コード、パートナー管理画面、申請後の自動案内を提供していません。
                提供内容や契約条件が確定した場合は、料金・規約・問い合わせ窓口をこのページで更新します。
              </p>
              <p>
                いま確認できる機能は、AI回答の観測、参照元URLの確認、公開情報の整理案、同じ条件での継続測定です。
              </p>
            </div>
            <div className="mechanism-box">
              <div className="spec-row">
                <span>確認できるもの</span>
                <strong>AI回答・参照URL・公開情報の整理案</strong>
              </div>
              <div className="spec-row">
                <span>対象サイト</span>
                <strong>自動変更なし</strong>
              </div>
              <div className="spec-row">
                <span>制度の状態</span>
                <strong>準備中</strong>
              </div>
            </div>
          </div>
        </section>

        {/* パートナー制度の案内 */}
        <section className="partners-apply shell" id="partner-apply">
          <Card className="apply-container">
            <div className="apply-head">
              <span className="overline">次のステップ</span>
              <h2>まずは公開されている設計を確認してください</h2>
              <p>申請フォームは、実際の受付・案内機能を用意できるまで公開しません。現在のサービス仕様は以下から確認できます。</p>
            </div>
            <div className="partners-cta-row">
              <Link href="/methodology" className="button button-primary">
                測定方法を見る <ArrowIcon />
              </Link>
              <Link href="/pricing" className="button button-secondary">
                料金と提供範囲を見る
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <SiteFooter showSellerLinks={sellerReady()} />
    </div>
  );
}
