import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { ManagementEntry } from "@/components/management-entry";

export const metadata: Metadata = { title: "管理画面を開く", robots: { index: false, follow: false } };
export default function ManagePage() {
  return <MarketingShell eyebrow="管理画面" title="自分の診断・公開ページ・見守りを開く。" lead="利用開始時に保存した管理URLから、前回の続きに戻れます。見本ではなく、ご自身の情報を表示します。"><ManagementEntry /></MarketingShell>;
}
