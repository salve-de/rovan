"use client";

import { useMemo, useState } from "react";
import type { Citation, LostPrompt, Observation, ScanResult } from "@/lib/types";

type Stage = "すべて" | "認知" | "比較" | "検討" | "導入";

function stageFor(result: ScanResult, loss: LostPrompt) {
  const prompt = result.prompts?.find((item) => item.id === loss.promptId);
  if (prompt?.stage) return prompt.stage;
  if (prompt?.cluster === "comparison" || prompt?.cluster === "alternative" || prompt?.cluster === "value") return "比較";
  if (prompt?.cluster === "implementation" || prompt?.cluster === "support") return "導入";
  if (prompt?.cluster === "trust" || prompt?.cluster === "feature") return "検討";
  const text = `${prompt?.text || loss.prompt}`;
  if (/比較|違い|乗り換え|選んで|主要|代替/.test(text)) return "比較";
  if (/料金|費用|効果|実績|信頼|おすすめ/.test(text)) return "検討";
  if (/導入|期間|対応|サポート|始め|使い/.test(text)) return "導入";
  return "認知";
}

function stageLabel(stage: string) {
  return stage === "認知" ? "候補を探す質問" : stage === "比較" ? "比較の質問" : stage === "導入" ? "導入の質問" : "検討の質問";
}

function providerLabel(provider: string) {
  if (provider === "openai") return "OpenAI (ChatGPT)";
  if (provider === "perplexity") return "Perplexity AI";
  if (provider === "gemini") return "Google (Gemini)";
  return provider;
}

export function QuestionList({ result }: { result: ScanResult }) {
  const [stage, setStage] = useState<Stage>("すべて");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAllQuestions, setShowAllQuestions] = useState(false);

  const filtered = useMemo(() => result.lostPrompts.filter((loss) => stage === "すべて" || stageFor(result, loss) === stage), [result, stage]);
  const counts = useMemo(() => (["認知", "比較", "検討", "導入"] as const).map((item) => ({ stage: item, count: result.lostPrompts.filter((loss) => stageFor(result, loss) === item).length })), [result]);

  const displayedList = useMemo(() => {
    if (showAllQuestions || stage !== "すべて") return filtered.slice(0, 12);
    return filtered.slice(0, 3);
  }, [filtered, showAllQuestions, stage]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (expandedIds.size === filtered.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filtered.map((item) => item.promptId)));
    }
  }

  return (
    <div className="question-list-wrap">
      {/* 絞り込みツールバー */}
      <div className="question-list-toolbar" aria-label="質問を絞り込む">
        <div className="question-list-filter">
          <label htmlFor="question-stage">購入段階で絞り込み:</label>
          <select id="question-stage" value={stage} onChange={(event) => setStage(event.target.value as Stage)}>
            <option value="すべて">すべて（{result.lostPrompts.length}問）</option>
            {counts.map((item) => (
              <option value={item.stage} key={item.stage}>
                {item.stage}（{item.count}問）
              </option>
            ))}
          </select>
          <span className="question-list-filter-count">{filtered.length}問中 {displayedList.length}問を表示</span>
        </div>

        <button type="button" className="question-list-toggle-all" onClick={toggleAll}>
          {expandedIds.size === filtered.length ? "全問の判定根拠を閉じる" : "全問の判定根拠をまとめて表示"}
        </button>
      </div>

      {/* 質問カード一覧 */}
      <div className="question-card-list">
        {displayedList.map((loss, index) => {
          const stageName = stageFor(result, loss);
          const isExpanded = expandedIds.has(loss.promptId);

          return (
            <article className="question-card" key={loss.promptId}>
              <div className="question-card-top">
                <div className="question-card-index">{String(index + 1).padStart(2, "0")}</div>

                <div className="question-card-body">
                  <span className="ui-badge">{stageLabel(stageName)}</span>
                  <h3>「{loss.prompt}」</h3>
                  <p>{loss.summary}</p>
                </div>

                <div className="question-card-verdict">
                  <div>
                    今回先に含まれた候補:
                    <strong>{loss.winner || "特定できず"}</strong>
                  </div>
                  <div className="question-card-verdict-own">
                    自社:
                    <strong className="question-card-excluded">候補外（選出されず）</strong>
                  </div>
                </div>
              </div>

              {/* 出典・判定根拠の確認ボタン */}
              <div className="question-card-actions">
                <button
                  type="button"
                  className={`question-card-expand-btn${isExpanded ? " is-open" : ""}`}
                  onClick={() => toggleExpand(loss.promptId)}
                  aria-expanded={isExpanded}
                >
                  <span aria-hidden="true">{isExpanded ? "▲" : "▼"}</span>
                  <span>{isExpanded ? "AIの回答と参照元を閉じる" : "AIの回答と参照元を見る"}</span>
                </button>
                <span className="question-card-observation-count">{loss.observations.length}件のAI回答を確認</span>
              </div>

              {/* 展開される検証ログ */}
              {isExpanded ? (
                <div className="question-evidence-panel">
                  <div className="question-evidence-head">
                    <strong>AIの回答と参照元URL</strong>
                    <span>入力質問: 「{loss.prompt}」</span>
                  </div>

                  <div className="question-evidence-observations">
                    {loss.observations.map((obs: Observation) => (
                      <div className="question-evidence-observation" key={obs.id}>
                        <div className="question-evidence-observation-head">
                          <div className="question-evidence-provider">
                            <span className="ui-badge">{providerLabel(obs.provider)}</span>
                            <code>{obs.model}</code>
                          </div>
                          <div className="question-evidence-meta">
                            観測日時: {new Date(obs.startedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} · 応答: {obs.latencyMs}ms
                          </div>
                        </div>

                        {/* AIの生回答抜粋 */}
                        <div className="question-evidence-raw">
                          <strong>AI回答（抜粋）:</strong>
                          {obs.rawText}
                        </div>

                        {/* AI回答に含まれた参照元URL */}
                        {obs.citations && obs.citations.length > 0 ? (
                          <div>
                            <span className="question-evidence-citations-label">AI回答に含まれた参照元URL（Web Search Sources）:</span>
                            <ul className="question-evidence-citations">
                              {obs.citations.map((cite: Citation, cIdx: number) => (
                                <li key={cIdx}>
                                  <a href={cite.url} target="_blank" rel="noreferrer">
                                    {cite.title || cite.domain} ({cite.domain}) ↗
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <span className="question-evidence-citations-empty">※ この回答では参照元URLを取得できませんでした。</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {!filtered.length ? (
          <p className="empty-inline question-list-empty">この購入段階では候補外になった質問はありません。</p>
        ) : null}

        {filtered.length > 3 && stage === "すべて" ? (
          <div className="question-list-show-more">
            <button type="button" className={`question-list-show-more-btn${showAllQuestions ? " is-open" : ""}`} onClick={() => setShowAllQuestions(!showAllQuestions)}>
              {showAllQuestions
                ? "▲ 上位3問の要約表示に戻す"
                : `▼ 残り ${filtered.length - 3}問の全AI判定ログを表示する（計 ${filtered.length}問）`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
