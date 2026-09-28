import { ScanForm } from "@/components/scan-form";

const RANK_ROWS = [
  { name: "月澄相続パートナーズ", count: "21回", width: 100, tone: "navy" as const },
  { name: "花継相続相談社", count: "12回", width: 57, tone: "muted" as const },
  { name: "星紡ぎ法務サポート", count: "12回", width: 57, tone: "muted" as const },
];

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
            <div className="home-diagnosis-panel home-diagnosis-rank-panel">
              <div className="home-diagnosis-rank-list">
                {RANK_ROWS.map((row) => (
                  <div className="home-diagnosis-rank-item" key={row.name}>
                    <span>{row.name}</span>
                    <span className={`home-diagnosis-rank-bar tone-${row.tone}`} style={{ width: `${row.width}%` }} />
                    <span>{row.count}</span>
                  </div>
                ))}
                <span className="home-diagnosis-rank-more">… ほか3社（各12回）</span>
                <div className="home-diagnosis-rank-item home-diagnosis-rank-item-self">
                  <span>御社</span>
                  <span className="home-diagnosis-rank-bar tone-warn" style={{ width: "38%" }} />
                  <span>8回</span>
                </div>
              </div>
              <div className="home-diagnosis-rank-badge">
                <span>この地域で</span>
                <strong>7社中7番目</strong>
              </div>
            </div>
          </div>

          <div className="home-diagnosis-row">
            <div className="home-diagnosis-row-copy">
              <span className="home-diagnosis-row-num">2</span>
              <div className="home-diagnosis-row-text">
                <span className="home-diagnosis-row-title">どの質問で、負けている？</span>
                <span className="home-diagnosis-row-body">お客さんが聞きそうな質問ごとに、AIの答えを見せます。</span>
              </div>
            </div>
            <div className="home-diagnosis-panel home-diagnosis-qa-panel">
              <div className="home-diagnosis-qa-q">仕事帰りの夜に、相続の相談ができる事務所は？</div>
              <svg width="36" height="20" viewBox="0 0 36 20" fill="none" stroke="var(--border-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h24M22 4l6 6-6 6" /></svg>
              <div className="home-diagnosis-qa-a">
                <span className="home-diagnosis-qa-a-label">AIの答え</span>
                <span>月澄相続パートナーズ</span>
                <span className="home-diagnosis-qa-a-warn">御社の名前は出ていません</span>
              </div>
            </div>
          </div>

          <div className="home-diagnosis-row">
            <div className="home-diagnosis-row-copy">
              <span className="home-diagnosis-row-num">3</span>
              <div className="home-diagnosis-row-text">
                <span className="home-diagnosis-row-title">何をすれば、名前が出る？</span>
                <span className="home-diagnosis-row-body">大手が言っていない御社の強みから、次の一手を示します。</span>
              </div>
            </div>
            <div className="home-diagnosis-panel home-diagnosis-next-panel">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3a7 7 0 0 0-4 12.7V19h8v-3.3A7 7 0 0 0 14 3z" /><path d="M11 23h6" /></svg>
              <div className="home-diagnosis-next-text">
                <span className="home-diagnosis-next-label">次にやること</span>
                <span>「平日20時まで・オンライン相談できる」という強みを、AIが読める形で公開する</span>
              </div>
            </div>
          </div>
        </div>

        <div id="diagnosis-start" className="home-diagnosis-cta">
          <span className="home-diagnosis-cta-label">御社の結果を、いますぐ無料で見る</span>
          <ScanForm hideExtraToggle formId={null} submitLabel="無料で診断" placeholder="例: 青葉ベーカリー 高崎、@aoba_bakery、URL" label="会社名・店名、Instagram、ホームページのどれか" />
          <span className="home-diagnosis-cta-note">登録不要・ホームページがなくてもOK　｜　上の画面は見本です</span>
        </div>
      </div>
    </section>
  );
}
