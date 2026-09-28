import Image from "next/image";
import { ScanForm } from "@/components/scan-form";

export function HomeDiagnosis() {
  return (
    <section className="home-diagnosis">
      <div className="shell home-diagnosis-inner">
        <div className="home-diagnosis-head">
          <span className="home-diagnosis-eyebrow">無料の診断</span>
          <h2>無料の診断で、この3つが分かります。</h2>
        </div>

        <div className="home-diagnosis-rows">
          <div className="home-diagnosis-row">
            <div className="home-diagnosis-row-copy">
              <span className="home-diagnosis-row-num">1</span>
              <div className="home-diagnosis-row-text">
                <span className="home-diagnosis-row-title">御社は、何番目？</span>
                <span className="home-diagnosis-row-body">AIがすすめた回数を、同じ地域のライバルと比べます。</span>
              </div>
            </div>
            <figure className="home-diagnosis-shot">
              <Image src="/screens/report-rank.png" alt="診断レポートの実際の画面：AIの答えに名前が出た回数をライバルと比べた棒グラフ（見本）" width={912} height={297} sizes="(max-width: 1024px) 100vw, 800px" />
            </figure>
          </div>

          <div className="home-diagnosis-row">
            <div className="home-diagnosis-row-copy">
              <span className="home-diagnosis-row-num">2</span>
              <div className="home-diagnosis-row-text">
                <span className="home-diagnosis-row-title">どの質問で、負けている？</span>
                <span className="home-diagnosis-row-body">お客さんが聞きそうな質問ごとに、AIの答えを見せます。</span>
              </div>
            </div>
            <figure className="home-diagnosis-shot">
              <Image src="/screens/report-loss.png" alt="診断レポートの実際の画面：質問とAIの答え、御社の名前が出ていないこと（見本）" width={912} height={161} sizes="(max-width: 1024px) 100vw, 800px" />
            </figure>
          </div>

          <div className="home-diagnosis-row">
            <div className="home-diagnosis-row-copy">
              <span className="home-diagnosis-row-num">3</span>
              <div className="home-diagnosis-row-text">
                <span className="home-diagnosis-row-title">何をすれば、名前が出る？</span>
                <span className="home-diagnosis-row-body">大手が言っていない御社の強みから、次の一手を示します。</span>
              </div>
            </div>
            <figure className="home-diagnosis-shot">
              <Image src="/screens/report-action.png" alt="診断レポートの実際の画面：AIに伝える強みの候補3つ（見本）" width={846} height={284} sizes="(max-width: 1024px) 100vw, 800px" />
            </figure>
          </div>
        </div>

        <div id="diagnosis-start" className="home-diagnosis-cta">
          <span className="home-diagnosis-cta-label">御社の結果を、いますぐ無料で見る</span>
          <ScanForm hideExtraToggle formId={null} submitLabel="無料で診断" placeholder="例: 青葉ベーカリー 高崎、@aoba_bakery、URL" label="会社名・店名、Instagram、ホームページのどれか" />
          <span className="home-diagnosis-cta-note">登録不要・ホームページがなくてもOK　｜　上の画面は実際の診断レポート（見本のお店）です</span>
        </div>
      </div>
    </section>
  );
}
