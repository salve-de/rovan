import Image from "next/image";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { seller } from "@/lib/legal";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "プライバシー", description: "Rovanが診断、週次見守り、公開情報の整理に必要な情報を扱う範囲。" };

export default function PrivacyPage() {
  return <MarketingShell art={<Image src="/illustrations/padlock.svg" alt="" width={300} height={300} priority />} eyebrow="プライバシー" title="診断は非公開。公開ページは承認した内容だけ。" lead="Rovanは、診断・Watch・変更案の提供に必要な範囲で公開サイト、AI回答、会社メール、企業が入力した確認情報を取り扱います。">
    <h2>取得する情報</h2><ul><li>診断のために入力された会社名・商品名・サービス名・公開URL</li><li>名前から候補を探すときに検索サービスから返された公開サイト候補</li><li>対象サイトの公開HTML、robots.txt、sitemap、公開ページ上の事実</li><li>AIサービスへ送った入力名、購入前の質問と返された回答・参照元URL</li><li>Watch登録メール</li><li>企業が任意で入力した確認情報と根拠URL</li><li>生成した変更案と公開前チェック項目</li><li>利用状況、エラー、原価、セキュリティログ</li></ul>
    <h2>利用目的</h2><ul><li>会社、対象分野、比較候補、購入前の質問の整理</li><li>AI回答に含まれる候補、参照元URL、確認情報との差の観測</li><li>確認済み事実に基づく変更案の生成</li><li>週次Watch、通知、課金、サポート</li><li>不正利用防止、障害調査、品質評価</li><li>匿名・集計化したプロダクト改善</li></ul>
    <h2>公開範囲</h2><p>診断結果、Watch、未承認の入力情報・変更案は公開Webへ掲載しません。Rovanの公開情報ページは、内容を確認して公開操作を行った場合だけ公開します。サイトをお持ちでない場合も、入力した名称などの公開対象を事前に確認できます。継続更新を許可した場合は、その範囲の参照元付き事実を更新します。公開停止と自動更新の停止は管理画面から行えます。</p><p>診断結果・管理画面は検索インデックスから除外します。結果URL・管理用リンクを知る人は閲覧や許可された操作ができるため、共有しないでください。「非公開」は一般向け掲載を行わない意味であり、サービス処理に必要な委託先への送信まで否定するものではありません。</p>
    <h2>AIサービスへの送信</h2><p>名前入力から公開サイトを探すときは、入力された会社名・商品名・サービス名を設定済みの検索サービスへ送信します。診断ではOpenAI、Google Gemini、Perplexityへ購入前の質問と必要な対象分野の文脈を送信します。変更案の生成では、公開ページの抜粋と、ユーザーが入力した確認情報のうちドラフト作成に必要な内容をOpenAIへ送信する場合があります。入力前に、送信権限のない個人情報、秘密情報、契約上外部処理できない情報を含めないでください。</p>
    <h2>その他の第三者サービス</h2><p>永続保存にはSupabase、決済にはStripeを利用します。カード番号はRovanで保持しません。Watch登録・週次見守りの通知メールの配信にはResendを利用します。</p>
    <h2>保存・書き出し・削除</h2><p>無料結果、Watch履歴、確認情報、変更案はサービス提供と監査に必要な範囲で保持します。データ管理画面から、管理権限があるWatchと測定履歴を書き出し・削除できます。メール未登録の場合も管理用リンクから利用できます。他のWatchや公開プロフィールが参照する診断は保持されます。公開プロフィールの掲載停止は別途その管理画面で行います。削除の完了記録など、法令・運用上必要な記録は保持します。</p>
    <h2>安全管理</h2><p>サーバーの認証情報を利用者向け画面へ表示せず、未承認の確認情報と変更案は一般公開しません。URLの取得処理は内部IP、認証情報付きURL、不正なリダイレクト等を拒否します。変更案は公開Webまたは企業が入力した事実を素材とし、未確認数値を自動で事実として掲載しません。</p>
    <p><a className="document-link" href="/data-rights">データの書き出し・削除</a> · <a className="document-link" href="/manage">公開ページを管理する</a>{seller.email ? <> · <a className="document-link" href="/support">お問い合わせ</a></> : null}</p>
  </MarketingShell>;
}
