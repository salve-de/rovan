"use client";

import { useState } from "react";
import type { PositioningAdvice, StrategyOption } from "@/lib/types";

export function PositioningPanel({ positioning }: { positioning?: PositioningAdvice }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!positioning) return null;

  const strategies: StrategyOption[] = positioning.strategies || [];
  if (!strategies.length) {
    return <section className="positioning-section shell" aria-label="ポジショニング診断および戦略提言">
      <h2>推薦獲得の戦略を絞るための情報が不足しています。</h2>
      <p>対象顧客・用途の仮説や取得成功の回答ログを確認してから、御社が選ばれる領域を検討します。</p>
    </section>;
  }

  const current = strategies[selectedIndex] || strategies[0];

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // コピー不可環境では何もしない
    }
  }

  return (
    <section className="positioning-section shell" aria-label="ポジショニング診断および戦略提言">
      {/* 3つの強み候補（サイト解析から動的生成）。見出しは親セクションが持つ */}
      <p className="positioning-tabs-hint">強みを選ぶと、その強みで書いた紹介文に切り替わります</p>
      <div className="strategy-selector-tabs" role="tablist" aria-label="戦略方針の選択">
        {strategies.map((item, index) => {
          const isActive = selectedIndex === index;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              key={item.id || index}
              className={`strategy-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setSelectedIndex(index)}
            >
              <span className="tab-badge">{item.code}</span>
              <strong>{item.name}</strong>
              <small>{item.targetMarket}</small>
            </button>
          );
        })}
      </div>

      {/* 選択された戦略の核 */}
      <div className="winning-angle-card">
        <div className="winning-angle-badge">AIに伝える、御社固有の推薦軸</div>
        <h3>{current.coreThesis}</h3>
        <p>{current.strategicReason}</p>
      </div>

      {/* 回答ログ上の候補と、自社側で確認する情報 */}
      <div className="competitor-weakness-block">
        <div className="competitor-weakness-head">
          <h3>競合の候補表示と、御社が差別化を目指す領域</h3>
          <span className="ui-badge">※測定ログと公開情報を分けて確認するための案</span>
        </div>
        <p className="competitor-weakness-lead">比較候補の弱点を推測せず、今回の回答ログと自社側の公開情報を分けて確認します。</p>
        {current.competitorAnalysis.length ? (
          <div className="weakness-grid">
            {current.competitorAnalysis.map((item) => (
              <article className="weakness-card" key={item.name}>
                <div className="weakness-card-head">
                  <span className="competitor-tag">{item.name}</span>
                  <strong className="competitor-gap">回答ログ: {item.gap}</strong>
                </div>
                <div className="our-advantage-box">
                  <span className="advantage-label">選ばれる理由にできるか確認する情報：</span>
                  <p>{item.differentiation}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="competitor-weakness-empty">
            この戦略案に結びつく比較候補の回答ログはありません。自社の対応条件を参照元で確認し、他社の弱点は推測しません。
          </p>
        )}
      </div>

      {/* すぐに使える発信文（タブ切り替えでコンパクトに） */}
      <div className="actionable-messages-block">
        <div className="actionable-messages-head">
          <h3>確認用の紹介文案（ワンクリックコピー）</h3>
          <p className="actionable-messages-lead">強みを一から書き起こす手間を抑える下書きです。内容を確認してからご利用ください。自社サイトや資料への転用は任意で、Rovanの利用にサイト改修は必要ありません。</p>
        </div>

        <div className="actionable-messages-list">
          {(["profile", "website", "brief"] as const).map((key) => {
            const item = current.deliverables[key];
            return (
              <article className="actionable-message-card" key={key}>
                <div className="actionable-card-header">
                  <div>
                    <span className="channel-badge">{item.label}</span>
                  </div>
                  <button
                    type="button"
                    className="button-copy"
                    onClick={() => copyToClipboard(item.text, key)}
                    aria-label={`${item.label}をコピー`}
                  >
                    {copiedKey === key ? "コピー完了" : "文章をコピーする"}
                  </button>
                </div>
                <div className="actionable-copy-box">
                  <pre>{item.text}</pre>
                </div>
              </article>
            );
          })}
        </div>
      </div>

    </section>
  );
}
