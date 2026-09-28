import { BRAND } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Zen_Kaku_Gothic_New } from "next/font/google";
import { StructuredData } from "@/components/structured-data";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
  display: "swap",
});

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Rovan（ロヴァン）— ChatGPTに、御社はおすすめされていますか？", template: "%s | Rovan" },
  description: "Rovanは、AIに御社をすすめてもらうためのサービスです。御社の強みをAIが読める形で公開し、毎週AIの答えを確かめます。ホームページがなくても使えます。",
  applicationName: BRAND.name,
  openGraph: { siteName: BRAND.name, type: "website", locale: "ja_JP", title: "Rovan（ロヴァン）— ChatGPTに、御社はおすすめされていますか？", description: "Rovanは、AIに御社をすすめてもらうためのサービスです。御社の強みをAIが読める形で公開し、毎週AIの答えを確かめます。ホームページがなくても使えます。", url: "/" },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja" data-scroll-behavior="smooth" className={`${notoSansJP.variable} ${zenKakuGothicNew.variable}`}><head><link rel="alternate" type="application/json" href="/ai-index.json" title="Rovanの公開情報" /><link rel="alternate" type="text/plain" href="/llms.txt" title="RovanのAI向け公開情報" /></head><body>{children}<StructuredData /></body></html>;
}
