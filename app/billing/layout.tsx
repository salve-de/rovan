import type { Metadata } from "next";

export const metadata: Metadata = { title: "ご契約・お支払い", robots: { index: false, follow: false, noarchive: true } };

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
