import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { seller, sellerReady } from "@/lib/legal";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "プライバシーポリシー", description: "Rovanが集める情報と、その使い方。" };

const services = [
  ["OpenAI（ChatGPT）・Google（Gemini）・Perplexity", "AIへの質問と、分野・地域など質問に必要な情報", "AIの答えを調べるため"],
  ["Supabase", "診断の結果、公開ページ、設定", "保存するため"],
  ["Stripe", "お支払いの情報", "決済のため（カード情報はRovanには保存されません）"],
  ["Resend", "メールアドレスと通知の内容", "メールを送るため"],
];

export default function PrivacyPage() {
  return <MarketingShell art={<Image src="/illustrations/padlock.svg" alt="" width={300} height={300} priority />} title="プライバシーポリシー">
    <h2>集める情報</h2>
    <ul>
      <li>診断のために入れた社名・店名、ホームページやSNSのURL</li>
      <li>登録したメールアドレス（登録した場合だけ）</li>
      <li>公開ページに載せるお店の情報</li>
      <li>AIへの質問と、AIの答え</li>
      <li>利用の記録（エラーの調査と不正利用の防止のため）</li>
    </ul>
    <h2>使う目的</h2>
    <ul>
      <li>診断と毎週の測定、結果のお知らせ</li>
      <li>公開ページの作成と更新</li>
      <li>お支払いとお問い合わせへの対応</li>
      <li>不正利用の防止と、サービスの改善（個人が分からない形で）</li>
    </ul>
    <h2>公開されるもの</h2>
    <ul>
      <li>診断の結果と毎週の報告は公開しません。検索にも出ません。</li>
      <li>公開ページは、内容を確認して「公開」を押したものだけが公開されます。いつでも停止できます。</li>
      <li>結果や管理用リンクのURLを知っている人は、その画面を開けます。他の人には送らないでください。</li>
    </ul>
    <h2>外部のサービスに送る情報</h2>
    <p>次のサービスに、必要な情報だけを送ります。海外の事業者を含みます。</p>
    <table className="legal-table">
      <thead><tr><th>サービス</th><th>送るもの</th><th>目的</th></tr></thead>
      <tbody>{services.map(([name, data, purpose]) => <tr key={name}><td>{name}</td><td>{data}</td><td>{purpose}</td></tr>)}</tbody>
    </table>
    <p>他人の個人情報や、外に出せない秘密の情報は入力しないでください。</p>
    <h2>安全のための対策</h2>
    <ul>
      <li>パスワードなどの秘密の情報は、画面に表示しません。</li>
      <li>危険な接続先（社内ネットワークなど）には接続しません。</li>
      <li>確認していない数字を、事実として公開ページに載せることはありません。</li>
    </ul>
    <h2>保存と削除</h2>
    <p>サービスに必要な間だけ保存します。ダウンロードと削除は<Link href="/data-rights">データ管理</Link>からできます。法律で残す必要がある記録は保存します。</p>
    <h2>お問い合わせ</h2>
    {sellerReady()
      ? <p>{seller.legalName}（代表：{seller.representative}）<br />{seller.address}<br /><a href={`mailto:${seller.email}`}>{seller.email}</a>{seller.email ? <> ／ <Link href="/support">お問い合わせ</Link></> : null}</p>
      : <p>運営者の情報とお問い合わせ先は、準備ができしだいここに載せます。</p>}
  </MarketingShell>;
}
