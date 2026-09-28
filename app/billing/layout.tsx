import type { Metadata } from "next";

export const metadata: Metadata = { title: "契約管理", robots: { index: false, follow: false, noarchive: true } };

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
