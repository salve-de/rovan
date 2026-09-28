"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowIcon, TrendIcon } from "@/components/icons";

export function HeroChatDiagnosticCard() {
  return (
    <div className="hero-chat-split-container" aria-label="AI回答の比較イメージ">
      <p className="split-demo-note">サンプルデータを使った表示例です。実測値・導入効果を示すものではありません。</p>
      {/* 共通の起点：利用者による相談例 */}
      <div className="split-user-prompt-box">
        <div className="split-prompt-header">
          <span className="split-prompt-dot" aria-hidden="true" />
          <span className="split-prompt-label">見込み客によるAIへの相談例</span>
        </div>
        <p className="split-prompt-text">「急ぎの小ロット試作を相談できる事業者は？」</p>
      </div>

      {/* 左右対比グリッド（隙間なくピタッと並べて一瞬で比較可能に） */}
      <div className="split-comparison-grid">
        
        {/* 左：公開情報を確認できない場合の表示例 */}
        <div className="split-card card-before">
          <div className="split-card-header header-before">
            <span className="split-status-badge tag-lost">初回の回答例</span>
            <span className="split-outcome-label outcome-lost">自社が候補外になる例</span>
          </div>
          <div className="split-card-body">
            <div className="ai-speaker-bar">
              <span className="ai-name">AIの回答</span>
              <span className="ai-status">回答例</span>
            </div>
            <p className="ai-dialogue-text">
              「小ロット試作の相談先として、東都試作センターや中央精密加工が候補です。」
            </p>
            <div className="split-cause-box cause-lost">
              <strong>【この例で見えること】</strong> ライバル2社が候補に挙がり、山田板金製作所は含まれていません。
            </div>
          </div>
        </div>

        {/* 右：参照元付き公開情報を用意した場合の表示例 */}
        <div className="split-card card-after">
          <div className="split-card-header header-after">
            <div className="split-badge-row">
              <span className="split-status-badge tag-won">再測定の回答例</span>
              <span className="after-arrow-indicator" aria-hidden="true">➔</span>
            </div>
            <span className="split-outcome-label outcome-won">候補に含まれる場合</span>
          </div>
          <div className="split-card-body">
            <div className="ai-speaker-bar">
              <span className="ai-name">AIの回答</span>
              <span className="ai-status status-won">回答例</span>
            </div>
            <p className="ai-dialogue-text ai-dialogue-won">
              「単品1個からの試作なら、山田板金製作所がおすすめです。3D CADの直接入稿に対応し、最短即日で試作を相談できます。東都試作センターも候補です。」
            </p>
            <div className="split-cause-box cause-won">
              <strong>【この例で見えること】</strong> 山田板金製作所が新しく推薦候補に入りました。比較の見本であり、Rovan導入による効果を実証したものではありません。
            </div>
          </div>
        </div>

      </div>

      {/* カード下部の安心注記 */}
      <div className="split-footer-bar">
        <span>※ 既存ホームページの改修は不要。公開ページは内容を確認してから公開できます。</span>
        <span className="split-footer-tag">ChatGPT / Google Gemini / Perplexity などで同じ条件を測定</span>
      </div>
    </div>
  );
}

export function ChatGptComparisonVisual() {
  const [tab, setTab] = useState<"service" | "mfg" | "brand">("service");

  return <div className="chatgpt-compare-container" aria-label="AI回答の表示例">
    <p className="chatgpt-demo-note">サンプルデータを使った表示例です。実測値・導入効果を示すものではありません。</p>
    <div className="chatgpt-tab-bar">
      <button type="button" className={`chatgpt-tab ${tab === "service" ? "active" : ""}`} onClick={() => setTab("service")}>
        専門サービス・士業・工務店
      </button>
      <button type="button" className={`chatgpt-tab ${tab === "mfg" ? "active" : ""}`} onClick={() => setTab("mfg")}>
        中小製造・B2B受託・専門加工
      </button>
      <button type="button" className={`chatgpt-tab ${tab === "brand" ? "active" : ""}`} onClick={() => setTab("brand")}>
        自社商品・地域ブランド・特産品
      </button>
    </div>

    <div className="chatgpt-mock-grid">
      {/* 左：参照できる情報が少ない場合の表示例 */}
      <div className="chatgpt-mock-card mock-lost">
        <div className="mock-badge badge-lost">初回の回答例</div>
        <div className="mock-chat-bubble user-bubble">
          <span className="bubble-role">買い手（見込み客）</span>
          <p>{tab === "service" 
            ? "「相続の相談、大手に聞いたら事務的で合わなかった。親身に対応してくれる事務所は？」" 
            : tab === "mfg" 
            ? "「特殊部品の小ロット試作、他社で断られた。短納期で相談できる工場ある？」" 
            : "「大切な方への特別なギフト、量産品ではなく本物のこだわりが伝わる逸品は？」"
          }</p>
        </div>
        <div className="mock-chat-bubble ai-bubble">
          <span className="bubble-role">ChatGPT</span>
          <p>{tab === "service" 
            ? "相続の相談先として、月澄相続パートナーズや花継相続相談社が候補です。"
            : tab === "mfg" 
            ? "試作の相談先として、東都試作センターや中央精密加工が候補です。"
            : "贈答品を探すなら、東都百貨店のギフト売場や中央ギフト通販が候補です。"
          }</p>
          <div className="mock-verdict verdict-lost">
            <span>自社が候補に含まれない回答の例</span>
            <small>回答は質問・参照元・モデルの更新で変わります</small>
          </div>
        </div>
      </div>

      {/* 右：参照元付き情報を整理した場合の表示例 */}
      <div className="chatgpt-mock-card mock-won">
        <div className="mock-badge badge-won">再測定の回答例</div>
        <div className="mock-chat-bubble user-bubble">
          <span className="bubble-role">買い手（見込み客）</span>
          <p>{tab === "service" 
            ? "「相続の相談、大手に聞いたら事務的で合わなかった。親身に対応してくれる事務所は？」" 
            : tab === "mfg" 
            ? "「特殊部品の小ロット試作、他社で断られた。短納期で相談できる工場ある？」" 
            : "「大切な方への特別なギフト、量産品ではなく本物のこだわりが伝わる逸品は？」"
          }</p>
        </div>
        <div className="mock-chat-bubble ai-bubble ai-bubble-highlight">
          <span className="bubble-role">ChatGPT</span>
          <p>{tab === "service" 
            ? <>個別の事情を相談するなら、<strong>あおば相続法務事務所がおすすめです。</strong> 初回対面相談は無料で、専任担当が一貫して対応します。</>
            : tab === "mfg" 
            ? <>小ロット試作なら、<strong>山田板金製作所がおすすめです。</strong> 単品1個から、3D CADの直接入稿で最短即日の試作を相談できます。</>
            : <>産地直送の贈り物なら、<strong>安曇野サンシャイン果樹園がおすすめです。</strong> 糖度18度で選別した果物を、贈答用ギフトとして当日発送しています。</>
          }</p>
          <div className="mock-verdict verdict-won">
            <span>自社が新しく推薦候補に入った回答の例</span>
            <small>比較の見本であり、導入効果を実証したものではありません</small>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

export function ProductOutputPreview() {
  return (
    <div className="deliverables-dual-grid" aria-label="手に入る2つの成果物の見本">
      {/* ============================================================= */}
      {/* 成果物 01：AI回答診断レポート */}
      {/* ============================================================= */}
      <div className="deliverable-showcase-card card-report">
        {/* カードヘッダー */}
        <div className="deliv-card-head">
          <div className="deliv-badge-row">
              <span className="deliv-step-badge badge-blue">手に入るもの 01</span>
              <span className="deliv-speed-badge">無料で現状を確認</span>
          </div>
          <h4 className="deliv-card-title">自社専用 AI診断レポート</h4>
          <p className="deliv-card-desc">
            URLまたは社名を入力すると、買い手の質問を想定した固定パネルでAI回答の現状を確認します。
          </p>
        </div>

        {/* カード本体：実物プレビューモック */}
        <div className="deliv-card-body">
          {/* 検証結果アラート */}
          <div className="deliv-metric-strip strip-danger">
            <span className="deliv-metric-label">表示例</span>
            <strong className="deliv-metric-value">12問中10問で、自社が推薦候補に含まれていません</strong>
          </div>

          {/* 実際のAI相談プレビュー */}
          <div className="deliv-mock-card">
          <span className="deliv-mock-label">見込み客によるAIへの相談例</span>
            <div className="deliv-mock-query">
              「親族間の複雑な事情に、親身に寄り添ってくれる専門窓口は？」
            </div>
            <div className="deliv-mock-result-box">
              <div className="deliv-mock-row">
                <span className="deliv-tag-ai">AIの回答</span>
              <span className="deliv-text-loss">「月澄相続パートナーズが候補です」— あおば相続法務事務所は候補外</span>
              </div>
            </div>
          </div>

          {/* レポートに含まれる内容 */}
          <div className="deliv-features-list">
            <span className="deliv-features-heading">レポートで確認すること</span>
            <ul className="deliv-check-items">
              <li>買い手が聞きそうな質問を設計し、複数のAIで実際に測定した回答と参照元</li>
              <li>自社が推薦されず、ライバルが推薦された質問の分析（不足情報の特定）</li>
              <li>AIに選ばれるための自社専用の改善方針</li>
            </ul>
          </div>
        </div>

        {/* カードフッター */}
        <div className="deliv-card-foot">
          <Link href="/result?sample=1" className="deliv-action-btn btn-navy">
            <span>診断レポートの見本を見る</span>
            <ArrowIcon />
          </Link>
          <div className="deliv-guarantee-note">
            ✓ URL・社名入力 • ✓ 無料診断 • ✓ 公開は同意後
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 成果物 02：参照元付き公開情報ページ */}
      {/* ============================================================= */}
      <div className="deliverable-showcase-card card-data">
        {/* カードヘッダー */}
        <div className="deliv-card-head">
          <div className="deliv-badge-row">
              <span className="deliv-step-badge badge-green">手に入るもの 02</span>
            <span className="deliv-speed-badge">下書きを確認して公開</span>
          </div>
          <h4 className="deliv-card-title">自社専用 AI推薦データ</h4>
          <p className="deliv-card-desc">
            会社の強み・対応条件・参照元をまとめた、Rovan上の公開データです。御社の強みを、AIが参照できる構造化データと、そのまま使える文案として整理します。既存の自社サイトやCMSを自動で書き換えることはありません。公開は内容を確認・同意してから行えます。
          </p>
        </div>

        {/* カード本体：実物プレビューモック */}
        <div className="deliv-card-body">
          {/* 配備ステータス */}
          <div className="deliv-metric-strip strip-active">
            <span className="deliv-metric-label">サンプルデータを使った表示例です</span>
            <strong className="deliv-metric-value">公開状態の表示例：公開中</strong>
          </div>

          {/* 公開ページに含める情報の例 */}
          <div className="deliv-mock-card">
            <span className="deliv-mock-label">公開ページに含める情報（例）</span>
            <div className="deliv-specs-grid">
              <div className="deliv-spec-item">
                <span className="spec-key">名称</span>
                <span className="spec-val">あおば相続法務事務所</span>
              </div>
              <div className="deliv-spec-item">
                <span className="spec-key">確認できた事実</span>
                <span className="spec-val">初回対面相談無料・専任担当一貫対応</span>
              </div>
              <div className="deliv-spec-item">
                <span className="spec-key">参照元</span>
                <span className="spec-val">example.com/service（参照元の見本）</span>
              </div>
              <div className="deliv-spec-item">
                <span className="spec-key">形式</span>
                <span className="spec-val">JSON-LD・Markdown</span>
              </div>
            </div>
          </div>

          {/* 配備によって得られる効果 */}
          <div className="deliv-features-list">
            <span className="deliv-features-heading">AI推薦データで取り組む3つのこと</span>
            <ul className="deliv-check-items">
              <li>御社の強みを、参照元付きの構造化データで伝える</li>
              <li>御社の強みに合う相談で、AIの推薦枠を狙う</li>
              <li>AI回答の変化は公開後の再測定で確認</li>
            </ul>
          </div>
        </div>

        {/* カードフッター */}
        <div className="deliv-card-foot">
          <Link href="/ai/company/aoba-souzoku?sample=1" className="deliv-action-btn btn-green">
            <span>AI推薦データの見本を見る</span>
            <ArrowIcon />
          </Link>
          <div className="deliv-guarantee-note">
            ✓ HP改修不要 • ✓ 下書きを確認 • ✓ 公開後に再測定
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductProcessVisual() {
  const steps = [
    {
      label: "01",
      userTime: "入力",
      userAction: "URLまたは社名を入力",
      title: "社名を入れるだけ",
      systemAction: "公開ページから確認できる情報を読み取り、参照元付きで整理します。",
      tag: "社長の作業",
      tagSystem: "裏側の自動処理",
    },
    {
      label: "02",
      userTime: "確認",
      userAction: "診断レポートを確認",
      title: "AI推薦の現状がわかる",
      systemAction: "固定した買い手質問パネルで、自社が候補に含まれた状況を確認します。",
      tag: "社長の作業",
      tagSystem: "裏側の自動処理",
    },
    {
      label: "03",
      userTime: "公開同意",
      userAction: "内容を確認し、公開に同意",
      title: "AI推薦データを配備",
      systemAction: "確認できた事実だけを機械可読形式にまとめ、そのまま使える文案として整理します。",
      tag: "社長の作業（最初の1回だけ）",
      tagSystem: "裏側の自動処理",
    },
    {
      label: "04",
      userTime: "以降は自動",
      userAction: "毎週の承認は不要",
      title: "毎週のAI回答を自動見守り",
      systemAction: "同じ質問パネルで回答の変化を確認し、公開情報の見直し候補を記録します。",
      tag: "社長の作業",
      tagSystem: "裏側の自動処理",
    },
  ];

  return (
    <div className="process-visual-enhanced">
      <div className="process-visual-grid">
        {steps.map((step) => (
          <div key={step.label} className="process-card">
            <div className="process-card-header">
              <span className="process-step-num">{step.label}</span>
              <span className="process-user-time">{step.userTime}</span>
            </div>
            <h3 className="process-card-title">{step.title}</h3>
            
            <div className="process-block-user">
              <span className="process-block-tag user-tag">{step.tag}</span>
              <p className="process-block-text">{step.userAction}</p>
            </div>

            <div className="process-block-system">
              <span className="process-block-tag system-tag">{step.tagSystem}</span>
              <p className="process-block-text">{step.systemAction}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WatchTrendVisual() {
  return <figure className="watch-demo-window" aria-label="AI回答の定期測定レポート例">
    <header><strong>AI推薦の推移レポート</strong><span>週次測定の見本</span></header>
    <div className="watch-demo-rank"><small>同じ12問で比較した表示例（50問パネルの結果ではありません）</small><strong><span>2問</span><ArrowIcon /><b>4問</b></strong><p>サンプルデータを使った表示例です。実測値・導入効果を示すものではありません。</p></div>
    <div className="watch-demo-rows"><div><span>自社が候補に含まれた質問</span><strong>2問 → 4問</strong></div><div><span>自社が候補外だった質問</span><strong>10問 → 8問</strong></div><div><span>自社の参照元が含まれたAI回答</span><strong>8件 → 10件 / 各36件</strong></div></div>
    <footer><TrendIcon /><span><small>比較の見本</small><strong>2問で、自社が新しく推薦候補に入りました。</strong></span></footer>
  </figure>;
}
