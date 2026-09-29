import type { Metadata } from "next";
import { Suspense } from "react";
import { AiReadableClient } from "@/components/ai-readable-client";

export const metadata: Metadata = {
  title: "AI向け公開情報の下書き",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AiInfoPage() {
  return <Suspense fallback={<div className="full-loading" role="status">下書きを準備しています。</div>}><AiReadableClient /></Suspense>;
}
