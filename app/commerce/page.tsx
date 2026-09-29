import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { seller, sellerReady } from "@/lib/legal";
export const dynamic = "force-dynamic";
import { WATCH_MONTHLY_PRICE_LABEL, WATCH_MONTHLY_PRICE_TAX_EXCLUSIVE_LABEL } from "@/lib/pricing";

export const metadata: Metadata = { title: "特定商取引法に基づく表記", description: "Rovanの販売事業者、価格、支払い、解約、返金について。" };

const rows = [
  ["販売事業者", seller.legalName],
  ["運営責任者", seller.representative],
  ["所在地", seller.address],
  ["電話番号", seller.phone || "ご請求があれば、すぐにお知らせします"],
  ["メール", seller.email],
  ["販売価格", `AI推薦・自動見守りプラン ${WATCH_MONTHLY_PRICE_LABEL}（${WATCH_MONTHLY_PRICE_TAX_EXCLUSIVE_LABEL}）`],
  ["無料期間", "最初の14日間は無料です。自動で有料になることはありません。"],
  ["価格以外の費用", "ありません（インターネットの通信費はお客さまのご負担です）。"],
  ["支払方法", "クレジットカード（Stripe）"],
  ["支払時期", "有料で始めたときに1回目をお支払いいただき、以後は毎月自動で更新します。"],
  ["提供時期", "お支払いのあと、すぐに使えます。"],
  ["解約", "次の更新日の前までに、管理画面からいつでも解約できます。支払い済みの期間の終わりまで使えます。"],
  ["返金", "使い始めた期間の料金は、原則として返金しません（法律で必要な場合を除きます）。"],
  ["動作環境", "最新のパソコン・スマートフォンのブラウザ"],
];

export default function CommercePage() {
  if (!sellerReady()) notFound();
  return <MarketingShell art={<Image src="/illustrations/signing-contract.svg" alt="" width={300} height={300} priority />} title="特定商取引法に基づく表記">
    <dl className="definition-list">{rows.map(([label, content]) => <div key={label}><dt>{label}</dt><dd>{content}</dd></div>)}</dl>
  </MarketingShell>;
}
