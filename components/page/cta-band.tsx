import { ScanForm } from "@/components/scan-form";

/** ページ末尾の申込帯。ホームの最終CTAと同じ見た目・文言 */
export function CtaBand({ title = "御社の結果を、いますぐ無料で見る" }: { title?: string }) {
  return (
    <div className="home-diagnosis-cta pg-cta">
      <span className="home-diagnosis-cta-label">{title}</span>
      <ScanForm hideExtraToggle showLabel formId={null} submitLabel="無料で診断" placeholder="例: 青葉ベーカリー 高崎" label="社名・店名、Instagram、ホームページのどれか" />
      <span className="home-diagnosis-cta-note">登録・メール不要・ホームページなしでもOK・無料</span>
    </div>
  );
}
