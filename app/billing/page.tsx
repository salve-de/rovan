import Image from "next/image";
import { Suspense } from "react";
import { BillingClient } from "@/components/billing-client";
import { MarketingShell } from "@/components/marketing-shell";

export default function BillingPage() {
  return <MarketingShell compact art={<Image src="/illustrations/signing-contract.svg" alt="" width={300} height={300} priority />} title="ご契約・お支払い"><Suspense fallback={<div className="full-loading" role="status">読み込んでいます。</div>}><BillingClient /></Suspense></MarketingShell>;
}
