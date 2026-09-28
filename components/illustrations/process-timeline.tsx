function WeekNode({ x, done }: { x: number; done: boolean }) {
  return (
    <g opacity={done ? 1 : 0.4}>
      <circle cx={x} cy="112" r="17" fill={done ? "var(--brand)" : "var(--bg)"} stroke="var(--brand)" strokeWidth="2" />
      {done ? (
        <path d={`M${x - 7} 112l5 5 9-10`} fill="none" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <circle cx={x} cy="112" r="2.5" fill="var(--brand)" />
      )}
    </g>
  );
}

export function ProcessTimelineIllustration() {
  const weekX = [355, 412, 469, 526, 583, 640];
  const weekDone = [true, true, true, true, false, false];

  return (
    <svg
      className="process-timeline-illust"
      viewBox="0 0 700 190"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="仕組みの図。紺色の丸1『社名を入れる』から紺色の丸2『公開内容を確認してOK』まで社長が操作し、その先は緑の点線ループで毎週自動的にチェックが進んでいく"
    >
      {/* 上部ラベル：自動ループ区間 */}
      <text x="527" y="26" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--brand)">
        毎週、自動で確認・更新
      </text>

      {/* 社長操作の丸 1 */}
      <circle cx="50" cy="112" r="32" fill="var(--navy)" />
      <text x="50" y="121" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--bg)">1</text>
      <text x="50" y="164" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--navy)">社名を入れる</text>

      <line x1="86" y1="112" x2="150" y2="112" stroke="var(--navy)" strokeWidth="3" strokeLinecap="round" />

      {/* 社長操作の丸 2 */}
      <circle cx="184" cy="112" r="32" fill="var(--navy)" />
      <text x="184" y="121" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--bg)">2</text>
      <text x="184" y="164" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--navy)">
        <tspan x="184">公開内容を確認して</tspan>
      </text>
      <text x="184" y="180" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--navy)">OK</text>

      {/* 紺 → 緑への切り替わり（点線ループ開始） */}
      <line x1="220" y1="112" x2="270" y2="112" stroke="var(--border-strong)" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" />

      {/* ループ矢印アイコン */}
      <path d="M295 96a17 17 0 1 1-10 30" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
      <path d="M280 118l5 12 12-6Z" fill="var(--brand)" />

      <line x1="322" y1="112" x2="338" y2="112" stroke="var(--border-strong)" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" />

      {weekX.map((x, i) => (
        <g key={x}>
          {i > 0 && <line x1={weekX[i - 1] + 17} y1="112" x2={x - 17} y2="112" stroke="var(--border-strong)" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" />}
          <WeekNode x={x} done={weekDone[i]} />
          <text x={x} y="146" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text-subtle)">{i + 1}週</text>
        </g>
      ))}
      <text x="672" y="117" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text-subtle)">…</text>
    </svg>
  );
}
