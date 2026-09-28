import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";

export default function NotFound() {
  return <MarketingShell eyebrow="ページが見つかりません" title="このページは存在しないか、公開されていません。" lead="URLが変更されたか、ページが公開されていない可能性があります。">
    <p><Link href="/">ホームへ戻る</Link></p>
    <p>保存した管理リンクをお持ちの方は、<Link href="/manage">管理画面を開く</Link>から確認できます。</p>
  </MarketingShell>;
}
