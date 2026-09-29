"use client";

import { useState } from "react";
import type { Observation, ScanResult } from "@/lib/types";

function providerLabel(provider: string) {
  if (provider === "openai") return "ChatGPT";
  if (provider === "perplexity") return "Perplexity";
  if (provider === "gemini") return "Gemini";
  return provider;
}

/** 名前が出なかった質問の一覧。質問・AIがすすめた会社・御社の結果だけを見せ、答えは開いたときに出す */
export function QuestionList({ result }: { result: ScanResult }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const losses = result.lostPrompts;
  const shown = showAll ? losses.slice(0, 12) : losses.slice(0, 3);
  const brand = result.discovery.brandName;

  function toggle(id: string) {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (!losses.length) return <p className="empty-inline question-list-empty">名前が出なかった質問はありません。</p>;

  return (
    <div className="question-list-wrap">
      <div className="question-card-list">
        {shown.map((loss, index) => {
          const open = expandedIds.has(loss.promptId);
          return (
            <article className="question-card" key={loss.promptId}>
              <div className="question-card-top">
                <div className="question-card-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="question-card-body">
                  <h3>「{loss.prompt}」</h3>
                </div>
                <div className="question-card-verdict">
                  <div>AIがすすめた会社<strong>{loss.winner || "—"}</strong></div>
                  <div className="question-card-verdict-own">御社<strong className="question-card-excluded">名前なし</strong></div>
                </div>
              </div>

              <div className="question-card-actions">
                <button type="button" className={`question-card-expand-btn${open ? " is-open" : ""}`} onClick={() => toggle(loss.promptId)} aria-expanded={open}>
                  <span aria-hidden="true">{open ? "▲" : "▼"}</span>
                  <span>{open ? "閉じる" : "AIの答えを見る"}</span>
                </button>
              </div>

              {open ? (
                <div className="question-evidence-panel">
                  <div className="question-evidence-observations">
                    {loss.observations.map((observation: Observation) => (
                      <div className="question-evidence-observation" key={observation.id}>
                        <div className="question-evidence-observation-head">
                          <span className="ui-badge">{providerLabel(observation.provider)}</span>
                        </div>
                        {observation.recommendedEntities.length ? (
                          <ol className="question-evidence-ranking">
                            {observation.recommendedEntities.map((name) => <li key={name} className={name === brand ? "is-own" : undefined}>{name}{name === brand ? "（御社）" : ""}</li>)}
                          </ol>
                        ) : <p className="question-evidence-none">すすめられた会社はありませんでした。</p>}
                        {observation.rawText ? <details className="question-evidence-raw"><summary>答えの全文</summary><p>{observation.rawText}</p></details> : null}
                        {observation.citations?.length ? (
                          <ul className="question-evidence-citations">
                            {observation.citations.map((citation, citationIndex) => (
                              <li key={citationIndex}><a href={citation.url} target="_blank" rel="noreferrer">{citation.title || citation.domain} ↗</a></li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {losses.length > 3 ? (
          <div className="question-list-show-more">
            <button type="button" className={`question-list-show-more-btn${showAll ? " is-open" : ""}`} onClick={() => setShowAll(!showAll)}>
              {showAll ? "▲ たたむ" : `▼ 残り${Math.min(12, losses.length) - 3}問を見る`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
