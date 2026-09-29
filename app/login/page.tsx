import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { LoginClient } from "@/components/login-client";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "ログイン",
  description: "Rovanにログインします。",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  const googleEnabled = Boolean(env.googleClientId);
  return (
    <MarketingShell compact art={<Image src="/illustrations/phone-in-hand.svg" alt="" width={300} height={300} priority />} title="ログイン">
      <Suspense fallback={<div className="billing-panel"><p>読み込み中…</p></div>}>
        <LoginClient googleEnabled={googleEnabled} />
      </Suspense>
    </MarketingShell>
  );
}
