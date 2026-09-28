"use client";

const REALITIES = [
  {
    label: "現実 01",
    title: "検索で1位でも、AIに無視されれば客は来ない",
    body: "広告や比較サイトが並ぶ検索エンジンを避け、顧客はChatGPTに「どこが良い？」と直接相談する時代へ移りました。従来のSEOで上位にいても、AIが顧客に推薦する候補に入っていなければ、顧客の視界にすら入りません。",
    noteLabel: "見えない顧客流出:",
    note: "自社サイトのアクセス数だけを見ていても、AIの段階でライバルに奪われた顧客の存在には気付けません。",
  },
  {
    label: "現実 02",
    title: "人間向けの「綺麗なホームページ」は、AIには届かない",
    body: "写真やイメージ中心のパンフレットのようなウェブサイトは、AIにとっては中身の検証できない画像にすぎません。AIが推薦の根拠にするのは、機械が客観的に検証できる確定仕様データ（取扱分野・実績・対応条件）です。",
    noteLabel: "構造的な死角:",
    note: "ホームページを多額の費用でリニューアルしても、AIが解釈できる確定データがなければ推薦対象になりません。",
  },
  {
    label: "現実 03",
    title: "対策を放置すると、大手やライバルへの送客が固定化する",
    body: "AIは「客観的な根拠が確認できる安全な事業者」を優先して推薦します。自社の強みや専門性がデータ化されていない場合、AIはすでに情報の揃っている大手チェーンや競合他社を顧客に案内し続けます。",
    noteLabel: "手遅れになる前に:",
    note: "AIの回答傾向（「この地域・分野なら○○社」）が固定化する前に、AIが参照できる専用データを配備・維持することが不可欠です。",
  },
];

export function GoogleDeclineProblemSection() {
  return (
    <section id="google-decline" className="google-decline-section shell" aria-label="検索とAI回答の使い分け">
      <div className="problem-panel shadow-ambient-md">
        <div className="problem-panel-head">
          <span className="problem-panel-tag">検索からAI相談へ：購買行動の地殻変動</span>
          <h2>お客さんはGoogleで探すのをやめ、AIに「どこが良い？」と直接聞く時代へ。</h2>
          <p>
            広告や比較サイトが並ぶ検索結果よりも、中立で的確な答えをくれる生成AIへ相談する顧客が急速に増えています。<br />
            しかし、AIが検証できる確定データがWeb上に整っていなければ、御社は候補にすら挙がらず、静かに競合や大手へ顧客が流出します。<br />
            今、中小企業が直面している「3つの現実」を整理しました。
          </p>
        </div>

        <div className="problem-grid">
          {REALITIES.map((item) => (
            <div key={item.label} className="problem-card shadow-ambient-sm shadow-ambient-hover">
              <div className="problem-card-head">
                <span className="problem-card-num">{item.label}</span>
                <strong>{item.title}</strong>
              </div>
              <p>{item.body}</p>
              <div className="problem-card-note">
                <strong>{item.noteLabel}</strong> {item.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
