import Image from "next/image";

const PHASES = ["今日", "診断のあと", "公開のとき", "毎週ずっと"] as const;

const YOU_CARDS = [
  { title: "店名を入れる", body: "店名・Instagram・ホームページのどれかひとつ", kind: "solid" as const, num: 1 },
  { title: "内容を見て、OK", body: "公開する前に1回だけ確認します", kind: "solid" as const, num: 2 },
  { title: null, body: "結果を見るだけ\n（無料）", kind: "dashed" as const },
  { title: null, body: "何もしなくてOK\n報告が届くだけ", kind: "dashed" as const },
];

const ROVAN_CARDS = [
  { title: "AIに実際に聞く", body: "お客さんが聞きそうな質問を、3つのAIに聞いて調べます" },
  { title: "強みを見つける", body: "大手が言っていない強みを探し、AIが読めるページの下書きをつくります" },
  { title: "ページを公開", body: "御社のサイトは触らず、Rovan上に公開します" },
  { title: "毎週くり返す", body: "AIに聞き直し、ページを最新に保ち、変化を報告します", isRepeat: true },
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

export function HomeSteps() {
  return (
    <section className="home-steps">
      <div className="shell home-steps-inner">
        <div className="home-steps-head">
          <span className="home-steps-eyebrow">使い方</span>
          <h2>あなたがやるのは、たったこれだけ。</h2>
          <p>あとはRovanが、毎週続けます。</p>
        </div>

        <div className="home-steps-grid">
          <div className="home-steps-corner" aria-hidden="true" />
          {PHASES.map((phase, index) => (
            <div className={`home-steps-phase-label${index === 3 ? " is-brand" : ""}`} key={phase} style={{ gridArea: `h${index + 1}` }}>
              <span className="home-steps-phase-dot" />
              {phase}
            </div>
          ))}

          <div className="home-steps-avatar home-steps-avatar-you">
            <Image src="/illustrations/owner-idea.svg" alt="" width={88} height={88} aria-hidden="true" />
            <span>あなた</span>
          </div>
          {YOU_CARDS.map((card, index) => (
            <div className={`home-steps-card home-steps-card-you ${card.kind === "dashed" ? "is-dashed" : "is-solid"}`} key={`you-${index}`} style={{ gridArea: `y${index + 1}` }}>
              <span className="home-steps-role-label">あなた</span>
              {card.kind === "solid" ? (
                <>
                  <span className="home-steps-card-num">{card.num}</span>
                  <span className="home-steps-card-title">{card.title}</span>
                  <span className="home-steps-card-body">{card.body}</span>
                </>
              ) : (
                <span className="home-steps-card-placeholder"><Break text={card.body} /></span>
              )}
            </div>
          ))}

          <div className="home-steps-avatar home-steps-avatar-rovan">
            <span className="home-steps-avatar-mark" aria-hidden="true" />
            <span>Rovan</span>
          </div>
          {ROVAN_CARDS.map((card, index) => (
            <div className={`home-steps-card home-steps-card-rovan${card.isRepeat ? " is-repeat" : ""}`} key={`rovan-${index}`} style={{ gridArea: `r${index + 1}` }}>
              <span className="home-steps-role-label">Rovan</span>
              <span className="home-steps-card-title">
                {card.isRepeat ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 9a6 6 0 1 1-1.8-4.3" /><path d="M15 3v3.5h-3.5" /></svg>
                ) : null}
                {card.title}
              </span>
              <span className="home-steps-card-body">{card.body}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
