import { sellerReady } from "@/lib/legal";
import type { Metadata } from "next";
import { Suspense } from "react";
import { WatchClient } from "@/components/watch-client";

export const metadata: Metadata = { title: "週次見守り", robots: { index: false, follow: false, noarchive: true } };

export default function WatchPage() {
  return <Suspense fallback={<div className="full-loading" role="status">AI推薦状況を読み込んでいます。</div>}><WatchClient showSellerLinks={sellerReady()} /></Suspense>;
}
