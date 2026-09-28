import { Suspense } from "react";
import { BillingClient } from "@/components/billing-client";
import { MarketingShell } from "@/components/marketing-shell";

export default function BillingPage() {
  return <MarketingShell eyebrow="ご契約・お支払い" title="週次見守りのご契約を管理する。" lead="お支払い方法の変更、請求履歴の確認、解約は、Stripe（決済会社）の画面で行います。"><Suspense fallback={<div className="full-loading">契約情報を読み込んでいます。</div>}><BillingClient /></Suspense></MarketingShell>;
}
