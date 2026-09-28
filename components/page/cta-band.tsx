import { ScanForm } from "@/components/scan-form";

/** ページ末尾の申込帯。ホームの最終CTAと同じ見た目・文言 */
export function CtaBand({ title = "御社の結果を、いますぐ無料で見る" }: { title?: string }) {
  return (
    <div className="home-diagnosis-cta pg-cta">
      <span className="home-diagnosis-cta-label">{title}</span>
      <ScanForm hideExtraToggle formId={null} submitLabel="無料で診断" placeholder="例: 青葉ベーカリー 高崎、@aoba_bakery、URL" label="会社名・店名、Instagram、ホームページのどれか" />
      <span className="home-diagnosis-cta-note">登録不要・ホームページがなくてもOK・診断は無料</span>
    </div>
  );
}
