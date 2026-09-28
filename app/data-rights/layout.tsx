import type { Metadata } from "next";

export const metadata: Metadata = { title: "データ管理", robots: { index: false, follow: false, noarchive: true } };

export default function DataRightsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
