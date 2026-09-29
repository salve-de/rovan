import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { seller, sellerReady } from "@/lib/legal";
import { WATCH_MONTHLY_PRICE_LABEL } from "@/lib/pricing";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "利用規約", description: "Rovanの利用規約。" };

export default function TermsPage() {
  return <MarketingShell art={<Image src="/illustrations/signing-contract.svg" alt="" width={300} height={300} priority />} title="利用規約">
    <h2>Rovanがすること</h2>
    <ul>
      <li>社名やURLから、お客さんがAIに聞きそうな質問をつくり、ChatGPT・Gemini・Perplexityの答えに名前が出るかを調べます。</li>
      <li>御社の情報をまとめたページ（公開ページ）を、Rovanの中につくります。公開するのは、内容を確認して「公開」を押したときだけです。</li>
      <li>有料の見守り（AI推薦・自動見守りプラン）では、同じ質問で毎週測って結果をお知らせし、公開ページの情報も最新に保ちます。</li>
      <li>御社のホームページやSNSを書きかえることはありません。</li>
    </ul>
    <h2>約束できないこと</h2>
    <p>AIの答えは、日時や聞き方、AIの更新によって変わります。そのため、次のことは約束できません。</p>
    <ul>
      <li>AIの答えに名前が出ること、順番が上がること</li>
      <li>問い合わせ・契約・売上が増えること</li>
      <li>数字の変化が、Rovanの取り組みによるものかどうか</li>
    </ul>
    <p>画面の数字は、決まった質問へのAIの答えを数えたものです。お客さんの数や市場シェアではありません。</p>
    <h2>お願いすること</h2>
    <ul>
      <li>入力する情報は、正しく、公開してよいものにしてください。</li>
      <li>公開ページは、公開する前に内容を確認してください。</li>
    </ul>
    <h2>してはいけないこと</h2>
    <ul>
      <li>他の会社になりすますこと</li>
      <li>うその実績・口コミ・資格・「No.1」などを載せること</li>
      <li>他人の個人情報や、外に出せない秘密の情報を入力すること</li>
      <li>不正なアクセスや、診断を大量にくり返すこと</li>
      <li>他人の権利を侵害する情報を入力すること</li>
    </ul>
    {sellerReady() ? <>
      <h2>料金と解約</h2>
      <ul>
        <li>見守りは{WATCH_MONTHLY_PRICE_LABEL}です。最初の14日間は無料で、自動で有料になることはありません。</li>
        <li>有料で始める前に、決済の画面で金額と更新の条件を確認できます。有料の契約は毎月自動で更新されます。</li>
        <li>解約は、いつでも管理画面からできます。支払いの時期や返金は<Link href="/commerce">特定商取引法に基づく表記</Link>をご覧ください。</li>
      </ul>
    </> : null}
    <p><Link className="document-link" href="/privacy">プライバシーポリシー</Link>{seller.email ? <> · <Link className="document-link" href="/support">お問い合わせ</Link></> : null}</p>
  </MarketingShell>;
}
