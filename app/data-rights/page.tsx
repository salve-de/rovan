import Image from "next/image";
import { Suspense } from "react";
import { DataRightsClient } from "@/components/data-rights-client";
import { MarketingShell } from "@/components/marketing-shell";

export default function DataRightsPage() {
  return <MarketingShell compact art={<Image src="/illustrations/padlock.svg" alt="" width={300} height={300} priority />} eyebrow="データ管理" title="自分のRovanデータを管理する。" lead="メールで届いた管理用リンクから、保存されているデータを書き出したり、削除したりできます。メールアドレスを登録していなくても使えます。"><Suspense fallback={<div className="full-loading" role="status">データ管理を読み込んでいます。</div>}><DataRightsClient /></Suspense></MarketingShell>;
}
