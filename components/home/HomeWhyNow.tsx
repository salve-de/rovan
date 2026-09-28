const STATS = [
  {
    lead: "検索したときにAIが答えを出すと、\nホームページを見に行く人は",
    bars: [
      { value: "15%", label: "AIの答えなし", height: 84, tone: "neutral" },
      { value: "8%", label: "AIの答えあり", height: 45, tone: "warn" },
    ],
    result: "約半分",
    resultTone: "warn",
    source: "出典：Pew Research Center（2025年・米国の成人900人、68,879回の検索を分析）",
  },
  {
    lead: "AIの答えに名前が出た会社は、\nクリックされる割合が",
    bars: [
      { value: "0.52%", label: "名前なし", height: 62, tone: "neutral" },
      { value: "0.70%", label: "名前あり", height: 84, tone: "brand" },
    ],
    result: "+35%",
    resultTone: "brand",
    source: "出典：Seer Interactive（2025年・42社、2,510万回の表示を15か月分析）",
  },
  {
    lead: "AIにすすめられて来たお客さんは、\n成約する割合が",
    bars: [
      { value: "1", label: "普通の検索", height: 19, tone: "neutral" },
      { value: "4.4", label: "AI経由", height: 84, tone: "brand" },
    ],
    result: "4.4倍",
    resultTone: "brand",
    source: "出典：Semrush（2025年・マーケティング関連500以上のテーマを分析）",
  },
];

export function HomeWhyNow() {
  return (
    <section className="home-why-now">
      <div className="shell home-why-now-inner">
        <div className="home-why-now-head">
          <span className="home-why-now-eyebrow">検索からAI相談へ</span>
          <svg width="220" height="80" viewBox="0 0 220 80" role="img" aria-label="検索からAIへの相談に移り変わるイメージ図" className="home-why-now-icon">
            <circle cx="34" cy="38" r="20" fill="none" stroke="#9fb1bd" strokeWidth="4" />
            <line x1="48" y1="52" x2="62" y2="66" stroke="#9fb1bd" strokeWidth="5" strokeLinecap="round" />
            <path d="M86 40h40" stroke="#52616b" strokeWidth="3" strokeLinecap="round" />
            <path d="M118 30l14 10-14 10" fill="none" stroke="#52616b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="150" y="14" width="60" height="40" rx="10" fill="var(--brand-soft)" />
            <path d="M164 54l-6 12 14-12" fill="var(--brand-soft)" />
            <circle cx="170" cy="34" r="3.5" fill="var(--brand)" />
            <circle cx="182" cy="34" r="3.5" fill="var(--brand)" />
            <circle cx="194" cy="34" r="3.5" fill="var(--brand)" />
          </svg>
          <h2>検索で上位でも、選ばれない時代へ。</h2>
          <p>お客さんはもう、Googleで探さずAIに直接聞いています。</p>
        </div>

        <div className="home-why-now-grid">
          {STATS.map((stat) => (
            <div className="home-why-now-card" key={stat.source}>
              <span className="home-why-now-card-lead">
                {stat.lead.split("\n").map((line, index) => (
                  <span key={line}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </span>
              <div className="home-why-now-bars">
                {stat.bars.map((bar) => (
                  <div className="home-why-now-bar-col" key={bar.label}>
                    <span className={`home-why-now-bar-value tone-${bar.tone}`}>{bar.value}</span>
                    <div className={`home-why-now-bar tone-${bar.tone}`} style={{ height: `${bar.height}px` }} />
                    <span className={`home-why-now-bar-label tone-${bar.tone}`}>{bar.label}</span>
                  </div>
                ))}
                <span className={`home-why-now-result tone-${stat.resultTone}`}>{stat.result}</span>
              </div>
              <span className="home-why-now-source">{stat.source}</span>
            </div>
          ))}
        </div>

        <p className="home-why-now-conclusion">
          大事なのは、ホームページがあるかではなく、<span>AIの答えに名前が載るかどうか。</span>
        </p>
      </div>
    </section>
  );
}
