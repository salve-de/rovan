const INPUT_OPTIONS = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="20" height="20" rx="6" />
        <circle cx="13" cy="13" r="4.5" />
        <circle cx="18.6" cy="7.4" r="1" fill="currentColor" />
      </svg>
    ),
    label: "Instagram",
    value: "@aoba_bakery",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 11l9-7 9 7v11H4z" />
        <path d="M10 22v-6h6v6" />
      </svg>
    ),
    label: "店名と地域だけ",
    value: "青葉ベーカリー 高崎",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="5" width="20" height="16" rx="3" />
        <path d="M3 10h20" />
      </svg>
    ),
    label: "ホームページがあれば",
    value: "URL",
  },
];

function ArrowConnector() {
  return (
    <svg className="home-nosite-arrow" width="56" height="24" viewBox="0 0 56 24" fill="none" stroke="var(--brand-pale)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 12h34M36 5l8 7-8 7" />
    </svg>
  );
}

export function HomeNoSite() {
  return (
    <section className="home-nosite">
      <div className="shell home-nosite-inner">
        <div className="home-nosite-head">
          <span className="home-nosite-eyebrow">ホームページがない方へ</span>
          <h2>ホームページがなくても、大丈夫です。</h2>
          <p>Instagramだけ、店名だけでも。AIが読める御社のページを、Rovanがつくります。</p>
        </div>

        <div className="home-nosite-flow">
          <div className="home-nosite-inputs">
            <span className="home-nosite-inputs-label">入れるのは、どれかひとつ</span>
            {INPUT_OPTIONS.map((option) => (
              <div className="home-nosite-input-row" key={option.label}>
                <span className="home-nosite-input-icon">{option.icon}</span>
                <div className="home-nosite-input-text">
                  <span>{option.label}</span>
                  <strong>{option.value}</strong>
                </div>
              </div>
            ))}
          </div>

          <ArrowConnector />

          <div className="home-nosite-page">
            <span className="home-nosite-page-label">Rovanがつくる、AIが読めるページ</span>
            <div className="home-nosite-page-card">
              <div className="home-nosite-page-header">
                <span>お店の情報ページ</span>
                <strong>青葉ベーカリー</strong>
              </div>
              <div className="home-nosite-page-body">
                <span>場所</span><span>群馬県高崎市</span>
                <span>得意なこと</span><span>天然酵母のパン、朝7時から営業</span>
                <span>こんな方に</span><span>出勤前に焼きたてを買いたい方</span>
                <span>情報のもと</span><span>Instagramの公開情報</span>
              </div>
            </div>
          </div>

          <ArrowConnector />

          <div className="home-nosite-answer">
            <span className="home-nosite-answer-label">お客さんがAIに聞くと</span>
            <div className="home-nosite-answer-q">高崎で、朝早く開いているパン屋さんは？</div>
            <div className="home-nosite-answer-a">
              <span className="home-nosite-answer-a-label">AIの答え</span>
              <span><b>青葉ベーカリー</b>は朝7時から営業していて、天然酵母のパンが人気です。</span>
            </div>
            <span className="home-nosite-answer-note">見本です。AIの答えを約束するものではありません。</span>
          </div>
        </div>
      </div>
    </section>
  );
}
