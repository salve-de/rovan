import type { Metadata } from "next";
import { Suspense } from "react";
import { AiReadableClient } from "@/components/ai-readable-client";

export const metadata: Metadata = {
  title: "AIが読みやすいファイル",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AiInfoPage() {
  return <Suspense fallback={<div className="full-loading" role="status">読み込んでいます。</div>}><AiReadableClient /></Suspense>;
}
