import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ScanProgress } from "@/components/scan-progress";

export const metadata: Metadata = { title: "診断先を確認", robots: { index: false, follow: false, noarchive: true } };

export default async function ScanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim();
  // No diagnosis target — go straight back to the input form instead of flashing an empty search screen.
  if (!first(params.input) && !first(params.url)) redirect("/");
  return <Suspense fallback={<div className="full-loading">Rovanを準備しています。</div>}><ScanProgress /></Suspense>;
}
