import Image from "next/image";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { seller, sellerReady } from "@/lib/legal";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "利用規約", description: "Rovanの利用条件、測定上の制約、公開情報の下書きに関する条件。" };

export default function TermsPage() {
  return <MarketingShell art={<Image src="/illustrations/signing-contract.svg" alt="" width={300} height={300} priority />} eyebrow="利用規約" title="観測値と変更案を、保証と混同しないための条件。" lead="RovanはAI回答を観測し、改善候補と変更案を作成するサービスです。外部AIの順位・推薦・引用・問い合わせ・売上を支配または保証するものではありません。">
    <h2>サービス内容</h2><p>Rovanは、会社名・商品名・サービス名または公開URLを起点に診断対象の公開サイトを確認し、対象分野・比較候補・購入前の質問を整理します。各AIサービスの回答、回答に含まれた候補、参照元URL、確認できた事実との差、次に確認する項目を表示・保存します。名前から始めた場合は、公開検索で見つけた候補をユーザーが確認してからサイトを診断します。有料Watchでは、公開情報およびユーザーが入力した確認済み事実をもとに、見出し・本文・FAQ等の変更案を生成する場合があります。</p>
    <h2>測定上の制約</h2><p>AI回答はモデル、日時、場所、検索結果、質問表現、会話文脈、非決定性等により変動します。Rovanの数値は明示された観測パネルの結果であり、全利用者に共通する絶対順位ではありません。購入前の質問で候補外となった件数は、顧客数・問い合わせ数・失注件数を意味しません。</p>
    <h2>変更案の制約</h2><p>変更案は公開前の編集ドラフトです。Rovanは、入力・取得した事実の正確性、第三者権利、表示規制、業界規制、顧客許諾等を最終保証しません。ユーザーは公開前に事実、権利、法令、社内承認を確認します。Rovanは明示承認なしに顧客サイトへ変更案を公開しません。</p>
    <h2>保証しない事項</h2><ul><li>特定順位または推薦</li><li>特定の参照元URLや引用</li><li>購入前の質問で候補に入る割合の増加</li><li>検索流入、問い合わせ、契約または売上</li><li>施策と数値変化の因果関係</li><li>第三者サイト・AIサービスの継続提供</li></ul>
    <h2>ユーザーの責任</h2><p>ユーザーは、入力する会社情報、実績、顧客数、料金、認証、投資対効果等について入力・外部処理・公開に必要な権限を持ち、正確であることを確認します。Rovanが生成した文案は公開前にユーザーが確認します。</p>
    <h2>禁止事項</h2><ul><li>他社を装った確認情報の入力</li><li>虚偽の実績、レビュー、認証、No.1表示</li><li>送信権限のない秘密情報・個人情報・第三者情報の入力</li><li>不正アクセス、過剰な診断、制限回避</li><li>医療・金融・法務等の高リスク用途での無審査利用</li><li>第三者の権利を侵害する情報の入力</li></ul>
    {sellerReady() ? <><h2>有料Watch</h2><p>週次見守りは最初の14日間を無料で確認でき、この間は自動課金されません。有料化する場合は契約開始前に決済画面で価格、税、更新条件を確認できます。有料化後は月ごとの自動更新です。支払時期、解約、返金については「特定商取引法に基づく表記」をご確認ください。</p><p><a className="document-link" href="/commerce">特定商取引法に基づく表記</a></p></> : null}
    <p><a className="document-link" href="/privacy">データの取り扱い</a>{seller.email ? <> · <a className="document-link" href="/support">お問い合わせ</a></> : null}</p>
  </MarketingShell>;
}
