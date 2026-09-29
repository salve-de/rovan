import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { seller } from "@/lib/legal";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "お問い合わせ", description: "Rovanへのお問い合わせ。" };

export default function SupportPage() {
  if (!seller.email) notFound();
  return <MarketingShell compact art={<Image src="/illustrations/shop-conversation.svg" alt="" width={300} height={300} priority />} title="お問い合わせ">
    <p className="support-contact"><a className="button button-primary" href={`mailto:${seller.email}`}>{seller.email} にメールする</a></p>
    <p>受付時間：{seller.supportHours}</p>
    <h2>書いていただくと早く対応できること</h2>
    <ul><li>社名・店名</li><li>困っている画面と、起きた日時</li><li>正しい情報が分かるページのURL（訂正の場合）</li></ul>
    <p>管理用リンクは、メールに書かないでください。情報漏えい・不正アクセス・二重請求などは、件名に「至急」と入れてください。</p>
  </MarketingShell>;
}
