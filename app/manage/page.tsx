import Image from "next/image";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { ManagementEntry } from "@/components/management-entry";

export const metadata: Metadata = { title: "管理画面を開く", robots: { index: false, follow: false } };
export default function ManagePage() {
  return <MarketingShell compact art={<Image src="/illustrations/link-devices.svg" alt="" width={300} height={300} priority />} title="管理画面を開く"><ManagementEntry /></MarketingShell>;
}
