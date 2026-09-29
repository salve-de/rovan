import Image from "next/image";
import { Suspense } from "react";
import { DataRightsClient } from "@/components/data-rights-client";
import { MarketingShell } from "@/components/marketing-shell";

export default function DataRightsPage() {
  return <MarketingShell compact art={<Image src="/illustrations/padlock.svg" alt="" width={300} height={300} priority />} title="データ管理"><Suspense fallback={<div className="full-loading" role="status">読み込んでいます。</div>}><DataRightsClient /></Suspense></MarketingShell>;
}
