import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { seller, sellerReady } from "@/lib/legal";
export const dynamic = "force-dynamic";
import { WATCH_MONTHLY_PRICE_LABEL, WATCH_MONTHLY_PRICE_TAX_EXCLUSIVE_LABEL } from "@/lib/pricing";

export const metadata: Metadata = { title: "特定商取引法に基づく表記", description: "Rovanの有料Watchに関する販売者、価格、提供、解約、返金条件。" };

const rows = [
  ["販売事業者", seller.legalName],
  ["運営責任者", seller.representative],
  ["所在地", seller.address],
  ["電話番号", seller.phone || "請求により遅滞なく開示"],
  ["メール", seller.email],
  ["販売価格", `Watch ${WATCH_MONTHLY_PRICE_LABEL}／${WATCH_MONTHLY_PRICE_TAX_EXCLUSIVE_LABEL}。Stripe Checkoutにも税込総額を表示します。`],
  ["販売価格以外の費用", "本サービスの月額料金以外に、本サービスから別途請求する費用はありません。インターネット接続等の通信費は利用者負担です。"],
  ["支払方法", "クレジットカード決済（Stripe）"],
  ["支払時期", "申込時に初回決済し、以後は月ごとに自動更新します。"],
  ["提供時期", "決済完了後、対象の週次測定プランを利用できます。初回の測定結果と公開前の変更案は、利用するAIサービスおよび対象サイトの状態に応じて順次生成されます。"],
  ["解約", "次回更新日前までStripe Customer Portalから解約できます。解約後も当該請求期間末まで利用できます。"],
  ["返金", "デジタルサービスの性質上、提供開始後の利用済み期間は原則返金しません。法令上必要な場合を除きます。"],
  ["動作環境", "最新の主要デスクトップ・モバイルブラウザ。利用するAIサービスや対象サイトの状態により、一部の観測や変更案の生成に失敗する場合があります。"],
];

export default function CommercePage() {
  if (!sellerReady()) notFound();
  return <MarketingShell eyebrow="特定商取引法" title="特定商取引法に基づく表記。" lead="有料Watchの販売者、価格、提供内容、更新、解約、返金条件を表示します。">
    <dl className="definition-list">{rows.map(([label, content]) => <div key={label}><dt>{label}</dt><dd>{content}</dd></div>)}</dl>
    <h2>サービスの性質</h2><p>Rovanは、指定した質問・AI・日時の条件で回答を記録し、回答に含まれた候補や参照URLを比較します。公開サイトから抽出した記載候補は、内容を確認してから公開できます。AIの推薦・引用・検索順位・問い合わせ・契約・売上は保証しません。対象会社のサイトを自動変更することもありません。</p>
  </MarketingShell>;
}
