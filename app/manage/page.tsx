import Image from "next/image";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { ManagementEntry } from "@/components/management-entry";

export const metadata: Metadata = { title: "管理画面を開く", robots: { index: false, follow: false } };
export default function ManagePage() {
  return <MarketingShell compact art={<Image src="/illustrations/link-devices.svg" alt="" width={300} height={300} priority />} eyebrow="管理画面" title="前回の続きを、ここから開く。" lead="診断・公開ページ・週次見守りを開けます。診断のあとに表示された、またはメールで届いた「管理用リンク」を貼りつけてください。"><ManagementEntry /></MarketingShell>;
}
