import Image from "next/image";
import { Suspense } from "react";
import { DataRightsClient } from "@/components/data-rights-client";
import { MarketingShell } from "@/components/marketing-shell";

export default function DataRightsPage() {
  return <MarketingShell compact art={<Image src="/illustrations/padlock.svg" alt="" width={300} height={300} priority />} eyebrow="データ管理" title="自分のRovanデータを管理する。" lead="週次見守りの管理URLから、保存データを書き出すか、削除できます。メール未登録でも利用できます。"><Suspense fallback={<div className="full-loading">データ管理を読み込んでいます。</div>}><DataRightsClient /></Suspense></MarketingShell>;
}
