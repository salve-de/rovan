import Image from "next/image";
const ROVAN_STEPS = [
  { n: 1, text: "大手が言っていない、\n御社の強みを見つける" },
  { n: 2, text: "AIが読める御社のページに\nまとめて公開する" },
  { n: 3, text: "毎週AIに聞き直して、\n名前が出たか確かめる" },
];

function Break({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, index) => (
        <span key={line}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </>
  );
}

export function HomeChange() {
  return (
    <section id="how" className="home-change">
      <div className="shell home-change-inner">
        <div className="home-change-head">
          <span className="home-change-eyebrow">Rovanで、こう変わります</span>
          <h2>「この相談なら、御社」。<br />AIにそう答えてもらえる会社へ。</h2>
          <p>大手と正面から戦わず、御社だけの強みが活きる質問で、AIに名前を出します。</p>
        </div>

        <div className="home-change-compare">
          <div className="home-change-panel home-change-panel-before">
            <span className="home-change-badge home-change-badge-before">いま</span>
            <div className="home-change-bubble-q">大田区で、単品1個から試作を頼める板金屋さんは？</div>
            <div className="home-change-bubble-a home-change-bubble-a-before">
              <span className="home-change-bubble-label">AIの答え</span>
              <span>東都試作センター、中央精密加工、京浜メタルワークスなどが候補です。</span>
            </div>
            <div className="home-change-result home-change-result-before">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="8" /><path d="M7 7l6 6M13 7l-6 6" /></svg>
              単品1個に対応していても、名前が出ない
            </div>
          </div>

          <div className="home-change-steps">
            <span className="home-change-steps-title">Rovanがやること</span>
            {ROVAN_STEPS.map((step) => (
              <div className="home-change-step" key={step.n}>
                <span className="home-change-step-num">{step.n}</span>
                <span className="home-change-step-text"><Break text={step.text} /></span>
              </div>
            ))}
          </div>

          <div className="home-change-panel home-change-panel-after">
            <span className="home-change-badge home-change-badge-after">Rovanのあと（見本）</span>
            <div className="home-change-bubble-q">大田区で、単品1個から試作を頼める板金屋さんは？</div>
            <div className="home-change-bubble-a home-change-bubble-a-after">
              <span className="home-change-bubble-label">AIの答え</span>
              <span><b>山田板金製作所</b>なら、単品1個から、3D CADデータで最短翌日に試作できます。</span>
              <span className="home-change-bubble-source">情報のもと：山田板金製作所のページ（Rovan）</span>
            </div>
            <div className="home-change-result home-change-result-after">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="8" /><path d="M6.5 10.2l2.4 2.4 4.6-4.8" /></svg>
              御社の強みで、名前が出る
            </div>
          </div>
        </div>

        <div className="home-change-weekly">
          <div className="home-change-weekly-copy">
            <span className="home-change-report-label">毎週届く報告</span>
            <strong>名前が出た質問が、前と比べてどう変わったか。</strong>
            <span>同じ質問で毎週測った結果を、この画面でお知らせします。</span>
          </div>
          <figure className="home-diagnosis-shot">
            <Image src="/screens/watch-verdict.png" alt="週次見守りの実際の画面：名前が出た質問が2問から4問に増えたことを示す棒グラフ（見本）" width={912} height={348} sizes="(max-width: 1024px) 100vw, 760px" />
          </figure>
        </div>

        <p className="home-change-disclaimer">画面は見本のお店のものです。AIの答えや結果を約束するものではありません。</p>
      </div>
    </section>
  );
}
