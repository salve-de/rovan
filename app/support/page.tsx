import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { seller } from "@/lib/legal";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "お問い合わせ", description: "診断結果、公開情報、請求、データ削除に関するお問い合わせ窓口。" };

export default function SupportPage() {
  if (!seller.email) notFound();
  return <MarketingShell compact art={<Image src="/illustrations/shop-conversation.svg" alt="" width={300} height={300} priority />} eyebrow="お問い合わせ" title="診断、請求、情報訂正の窓口。" lead="対象会社の誤認、比較候補、引用URL、請求、データ削除について連絡できます。">
    <h2>問い合わせに含める情報</h2><ul><li>会社名と、問題がある画面の名前</li><li>対象会社URLまたは公開情報ページのURL</li><li>問題が起きた日時・操作・表示内容</li><li>正しい情報を確認できる公開URL</li></ul><p>管理URL・管理キーは操作権限を含むため、メールやスクリーンショットに含めないでください。</p>
    <h2>対応する依頼</h2><ul><li>会社・ブランド・対象分野の誤認</li><li>比較候補の誤り</li><li>AI回答・引用URL抽出の不具合</li><li>企業入力情報の訂正</li><li>支払方法・請求・解約</li><li>データ書き出し・削除</li><li>公開情報ページの非公開・訂正</li></ul>
    <h2>連絡先</h2><p><a className="document-link" href={`mailto:${seller.email}`}>{seller.email}</a></p>
    <p>受付時間: {seller.supportHours}</p>
    <h2>緊急性</h2><p>情報漏えい、不正アクセス、誤課金等の重大事象は件名の先頭に「URGENT」を付けてください。AI回答の順位や引用URLの通常変動は緊急障害には該当しません。</p>
  </MarketingShell>;
}
