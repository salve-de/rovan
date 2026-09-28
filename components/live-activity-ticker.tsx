"use client";

import { useEffect, useState } from "react";

type ActivityItem = {
  id: string;
  time: string;
  badge: string;
  text: string;
  highlight: string;
};

const ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    time: "表示例",
    badge: "公開情報整理",
    text: "参照元付きの公開情報ページを",
    highlight: "下書きとして確認できます",
  },
  {
    id: "act-2",
    time: "表示例",
    badge: "AI回答測定",
    text: "同じ質問パネルの回答を",
    highlight: "前回と比較できます",
  },
  {
    id: "act-3",
    time: "表示例",
    badge: "参照元確認",
    text: "掲載する情報と参照元を",
    highlight: "公開前に確認できます",
  },
  {
    id: "act-4",
    time: "表示例",
    badge: "差分確認",
    text: "AI回答と参照元の変化を",
    highlight: "測定ログで確認できます",
  },
  {
    id: "act-5",
    time: "表示例",
    badge: "公開後の確認",
    text: "公開した情報の変化を",
    highlight: "次回の測定で確認します",
  },
];

export function LiveActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ACTIVITIES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const current = ACTIVITIES[currentIndex];

  return (
    <div className="live-activity-bar" aria-label="サービス画面の表示例">
      <div className="shell live-activity-inner">
        <div className="live-pulse-wrapper">
          <span className="live-pulse-dot" />
          <span className="live-label">見本</span>
        </div>
        <div className="live-ticker-content" key={current.id}>
          <span className="live-time">{current.time}</span>
          <span className="live-badge">{current.badge}</span>
          <span className="live-text">
            {current.text} <strong className="live-highlight">{current.highlight}</strong>
          </span>
        </div>
        <div className="live-stat-counter">
          <span>実際の導入数ではない表示例です</span>
        </div>
      </div>
    </div>
  );
}
