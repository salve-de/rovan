import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileManagementClient } from "@/components/profile-management-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "公開ページの管理",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function ProfileManagementPage() {
  // Credentials are read only by the private client, never serialized into public pages.
  return <Suspense fallback={<p>管理画面を読み込んでいます。</p>}><ProfileManagementClient /></Suspense>;
}
