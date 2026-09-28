export function HeroChatIllustration() {
  return (
    <svg
      className="hero-chat-illust"
      viewBox="0 0 400 340"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="見本のチャット画面。「大田区で、小ロットの試作を頼める板金屋さんは？」という質問に対し、AIが東都試作センター・中央精密加工・京浜メタルワークスの3社を回答し、御社の名前がないことをオレンジの注釈と矢印で示している"
    >
      {/* 端末フレーム */}
      <rect x="3" y="3" width="394" height="334" rx="18" fill="var(--bg)" stroke="var(--border-strong)" strokeWidth="2" />
      <rect x="3" y="3" width="394" height="34" rx="18" fill="var(--surface)" />
      <rect x="3" y="19" width="394" height="18" fill="var(--surface)" />
      <circle cx="24" cy="20" r="4.5" fill="var(--border-strong)" />
      <circle cx="40" cy="20" r="4.5" fill="var(--border-strong)" />
      <circle cx="56" cy="20" r="4.5" fill="var(--border-strong)" />
      <rect x="326" y="10" width="56" height="20" rx="10" fill="var(--surface)" stroke="var(--border-strong)" />
      <text x="354" y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-subtle)">見本</text>

      {/* ユーザー吹き出し（右寄せ） */}
      <rect x="70" y="52" width="314" height="52" rx="14" fill="var(--info-soft)" />
      <text x="366" y="73" textAnchor="end" fontSize="14" fontWeight="700" fill="var(--text)">大田区で、小ロットの試作を</text>
      <text x="366" y="93" textAnchor="end" fontSize="14" fontWeight="700" fill="var(--text)">頼める板金屋さんは？</text>

      {/* AI回答吹き出し（左寄せ） */}
      <rect x="16" y="118" width="368" height="164" rx="14" fill="var(--surface)" stroke="var(--border)" />
      <text x="34" y="142" fontSize="13" fontWeight="700" fill="var(--text-subtle)">おすすめは次の3社です。</text>

      <text x="34" y="170" fontSize="14" fontWeight="700" fill="var(--text)">1. 東都試作センター</text>
      <text x="34" y="196" fontSize="14" fontWeight="700" fill="var(--text)">2. 中央精密加工</text>
      <text x="34" y="222" fontSize="14" fontWeight="700" fill="var(--text)">3. 京浜メタルワークス</text>

      <line x1="34" y1="238" x2="366" y2="238" stroke="var(--border)" strokeWidth="1" />
      <text x="34" y="262" fontSize="13" fill="var(--text-subtle)">（御社の名前は挙がりません）</text>

      {/* オレンジの手書き風注釈 + 矢印 */}
      <path d="M300 300 C 270 262, 230 244, 196 232" fill="none" stroke="var(--warn)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 7" />
      <path d="M196 232 l 14 -3 l -1 15 Z" fill="var(--warn)" />
      <text x="222" y="318" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--warn)" fontFamily="var(--font-hand, inherit)">
        御社の名前が、ない。
      </text>
    </svg>
  );
}
