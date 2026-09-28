export function SearchToAiIcon() {
  return (
    <svg viewBox="0 0 220 80" role="img" aria-label="検索エンジンでの比較からAIへの直接相談へ、購買行動が移り変わるイメージ図" className="search-to-ai-icon">
      {/* 虫眼鏡（検索） */}
      <circle cx="34" cy="38" r="20" fill="none" stroke="var(--text-subtle)" strokeWidth="4" />
      <line x1="48" y1="52" x2="62" y2="66" stroke="var(--text-subtle)" strokeWidth="5" strokeLinecap="round" />

      {/* 矢印 */}
      <path d="M86 40h40" stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" />
      <path d="M118 30l14 10-14 10" fill="none" stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* 吹き出し（AI） */}
      <rect x="150" y="14" width="60" height="40" rx="10" fill="var(--brand-soft)" />
      <path d="M164 54l-6 12 14-12" fill="var(--brand-soft)" />
      <circle cx="170" cy="34" r="3.5" fill="var(--brand)" />
      <circle cx="182" cy="34" r="3.5" fill="var(--brand)" />
      <circle cx="194" cy="34" r="3.5" fill="var(--brand)" />
    </svg>
  );
}
