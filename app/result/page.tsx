import { sellerReady } from "@/lib/legal";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultClient } from "@/components/result-client";

export const metadata: Metadata = { title: "AI診断レポート", robots: { index: false, follow: false, noarchive: true } };

export default function ResultPage() {
  return <Suspense fallback={<div className="full-loading">診断結果を読み込んでいます。</div>}><ResultClient showSellerLinks={sellerReady()} /></Suspense>;
}
