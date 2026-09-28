export function WeeklyTrendChart() {
  // 見本の推移値（候補に入った質問数）: 1週目〜5週目
  const points = [2, 2, 3, 3, 4];
  const max = 5;
  const w = 220;
  const h = 80;
  const stepX = w / (points.length - 1);
  const coords = points.map((v, i) => [i * stepX, h - (v / max) * h]);
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h + 16}`} role="img" aria-label="週次見守りの推移見本。候補に入った質問数が5週間で2問から4問へ増えている折れ線グラフ" className="weekly-trend-chart">
      <line x1="0" y1={h} x2={w} y2={h} stroke="var(--border)" strokeWidth="1" />
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 5 : 3} fill="var(--brand)" />
      ))}
      <text x={w} y={h + 14} textAnchor="end" fontSize="10" fill="var(--text-subtle)">見本の推移（5週間）</text>
    </svg>
  );
}
