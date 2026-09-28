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
      <div
        className="question-list-toolbar shadow-ambient-sm"
        aria-label="質問を絞り込む"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "var(--bg-base, #ffffff)",
          border: "1px solid var(--border-subtle, #e2e8f0)",
          borderRadius: "10px",
          padding: "12px 18px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <label htmlFor="question-stage" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--navy, #0f172a)" }}>
            購入段階で絞り込み:
          </label>
          <select
            id="question-stage"
            value={stage}
            onChange={(event) => setStage(event.target.value as Stage)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle, #cbd5e1)",
              background: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--navy, #0f172a)",
              outline: "none",
            }}
          >
            <option value="すべて">すべて（{result.lostPrompts.length}問）</option>
            {counts.map((item) => (
              <option value={item.stage} key={item.stage}>
                {item.stage}（{item.count}問）
              </option>
            ))}
          </select>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted, #64748b)" }}>
            {filtered.length}問中 {displayedList.length}問を表示
          </span>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          style={{
            fontSize: "0.78rem",
            padding: "6px 14px",
            background: "var(--bg-surface, #f8fafc)",
            border: "1px solid var(--border-subtle, #cbd5e1)",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 700,
            color: "var(--navy, #0f172a)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            transition: "all 0.15s ease",
          }}
        >
          {expandedIds.size === filtered.length ? "全問の判定根拠を閉じる" : "全問の判定根拠をまとめて表示"}
        </button>
      </div>

      {/* 質問カード一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {displayedList.map((loss, index) => {
          const stageName = stageFor(result, loss);
          const isExpanded = expandedIds.has(loss.promptId);

          return (
            <article
              key={loss.promptId}
              className="shadow-ambient-sm"
              style={{
                display: "block",
                background: "var(--bg-base, #ffffff)",
                border: "1px solid var(--border-subtle, #e2e8f0)",
                borderRadius: "12px",
                padding: "20px 24px",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                {/* 番号 */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "var(--bg-surface, #f1f5f9)",
                    border: "1px solid var(--border-subtle, #e2e8f0)",
                    color: "var(--navy, #0f172a)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono, monospace)",
                    flexShrink: 0,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                {/* 質問本文と要約 */}
                <div style={{ flex: "1 1 400px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: "var(--bg-surface, #f1f5f9)",
                        color: "var(--text-secondary, #475569)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        border: "1px solid var(--border-subtle, #e2e8f0)",
                      }}
                    >
                      {stageLabel(stageName)}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "1.02rem", fontWeight: 700, color: "var(--navy, #0f172a)", lineHeight: 1.45 }}>
                    「{loss.prompt}」
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-secondary, #475569)", lineHeight: 1.6 }}>
                    {loss.summary}
                  </p>
                </div>

                {/* 勝敗判定バッジ */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    flexShrink: 0,
                    background: "var(--bg-surface, #f8fafc)",
                    border: "1px solid var(--border-subtle, #e2e8f0)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    minWidth: "180px",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)" }}>
                    今回先に含まれた候補:
                    <strong style={{ display: "block", fontSize: "0.86rem", color: "var(--navy, #0f172a)", fontWeight: 700, marginTop: "2px" }}>
                      {loss.winner || "特定できず"}
                    </strong>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)", borderTop: "1px solid #e2e8f0", paddingTop: "4px" }}>
                    自社:
                    <strong style={{ display: "block", fontSize: "0.86rem", color: "var(--orange, #dc2626)", fontWeight: 800, marginTop: "2px" }}>
                      候補外（選出されず）
                    </strong>
                  </div>
                </div>
              </div>

              {/* 出典・判定根拠の確認ボタン */}
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle, #f1f5f9)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => toggleExpand(loss.promptId)}
                  style={{
                    background: isExpanded ? "#e0f2fe" : "var(--bg-surface, #f8fafc)",
                    border: isExpanded ? "1px solid #7dd3fc" : "1px solid var(--border-subtle, #e2e8f0)",
                    color: isExpanded ? "#0369a1" : "var(--navy, #0f172a)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                  aria-expanded={isExpanded}
                >
                  <span>{isExpanded ? "▲" : "▼"}</span>
                  <span>{isExpanded ? "AIの回答と参照元を閉じる" : "AIの回答と参照元を見る"}</span>
                </button>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted, #94a3b8)", fontFamily: "var(--font-mono, monospace)" }}>
                  {loss.observations.length}件のAI回答を確認
                </span>
              </div>

              {/* 展開される検証ログ */}
              {isExpanded ? (
                <div
                  className="question-evidence-panel"
                  style={{
                    marginTop: "12px",
                    padding: "16px 18px",
                    background: "var(--bg-surface, #f8fafc)",
                    border: "1px solid var(--border-subtle, #cbd5e1)",
                    borderRadius: "10px",
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                    <strong style={{ color: "var(--navy, #0f172a)", fontSize: "0.84rem" }}>
                      AIの回答と参照元URL
                    </strong>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted, #64748b)" }}>
                      入力質問: 「{loss.prompt}」
                    </span>
                  </div>

                  {/* 各AIサービスの回答ログ */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {loss.observations.map((obs: Observation) => (
                      <div
                        key={obs.id}
                        style={{
                          background: "#ffffff",
                          border: "1px solid var(--border-subtle, #e2e8f0)",
                          borderRadius: "8px",
                          padding: "12px 14px",
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.02)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                background: obs.provider === "openai" ? "#10a37f" : obs.provider === "perplexity" ? "#20808d" : "#4285f4",
                                color: "#ffffff",
                                padding: "2px 8px",
                                borderRadius: "4px",
                              }}
                            >
                              {providerLabel(obs.provider)}
                            </span>
                            <code style={{ fontSize: "0.74rem", color: "var(--text-secondary, #475569)" }}>{obs.model}</code>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted, #64748b)" }}>
                            観測日時: {new Date(obs.startedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} · 応答: {obs.latencyMs}ms
                          </div>
                        </div>

                        {/* AIの生回答抜粋 */}
                        <div style={{ background: "var(--bg-surface, #f1f5f9)", padding: "10px 12px", borderRadius: "6px", marginBottom: "10px", fontSize: "0.8rem", color: "#1e293b", lineHeight: 1.6 }}>
                          <strong style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted, #64748b)", marginBottom: "4px" }}>AI回答（抜粋）:</strong>
                          {obs.rawText}
                        </div>

                        {/* AI回答に含まれた参照元URL */}
                        {obs.citations && obs.citations.length > 0 ? (
                          <div>
                            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary, #475569)", display: "block", marginBottom: "4px" }}>
                              AI回答に含まれた参照元URL（Web Search Sources）:
                            </span>
                            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.76rem" }}>
                              {obs.citations.map((cite: Citation, cIdx: number) => (
                                <li key={cIdx} style={{ marginBottom: "3px" }}>
                                  <a
                                    href={cite.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: "var(--accent-blue, #0284c7)", textDecoration: "underline", wordBreak: "break-all" }}
                                  >
                                    {cite.title || cite.domain} ({cite.domain}) ↗
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.74rem", color: "var(--text-muted, #94a3b8)" }}>
                            ※ この回答では参照元URLを取得できませんでした。
                          </span>
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
          <p className="empty-inline" style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted, #64748b)" }}>
            この購入段階では候補外になった質問はありません。
          </p>
        ) : null}

        {/* 13,000pxスクロール地獄を解消する「残り質問の一括展開」ボタン */}
        {filtered.length > 3 && stage === "すべて" ? (
          <div style={{ textAlign: "center", marginTop: "12px", marginBottom: "8px" }}>
            <button
              type="button"
              onClick={() => setShowAllQuestions(!showAllQuestions)}
              style={{
                background: showAllQuestions ? "var(--bg-surface, #f1f5f9)" : "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
                color: showAllQuestions ? "var(--navy, #0f172a)" : "#ffffff",
                border: "1px solid var(--border-subtle, #cbd5e1)",
                borderRadius: "8px",
                padding: "12px 28px",
                fontSize: "0.86rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: showAllQuestions ? "none" : "0 2px 6px rgba(15, 23, 42, 0.16)",
                transition: "all 0.15s ease",
              }}
            >
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
