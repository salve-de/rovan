import { BRAND } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import { StructuredData } from "@/components/structured-data";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Rovan（ロヴァン）— ChatGPTに、御社はおすすめされていますか？", template: "%s | Rovan" },
  description: "自社サイトの改修・新規開設は不要。社名からAI推薦の現状を診断し、御社の強みを伝えるAI推薦データを作成。公開後の推薦状況を毎週追跡します。",
  applicationName: BRAND.name,
  openGraph: { siteName: BRAND.name, type: "website", locale: "ja_JP", title: "Rovan（ロヴァン）— ChatGPTに、御社はおすすめされていますか？", description: "自社サイトの改修・新規開設は不要。社名からAI推薦の現状を診断し、御社の強みを伝えるAI推薦データを作成。公開後の推薦状況を毎週追跡します。", url: "/" },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja" data-scroll-behavior="smooth"><head><link rel="alternate" type="application/json" href="/ai-index.json" title="Rovanの公開情報" /><link rel="alternate" type="text/plain" href="/llms.txt" title="RovanのAI向け公開情報" /></head><body>{children}<StructuredData /></body></html>;
}
