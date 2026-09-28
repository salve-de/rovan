import type { SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export function FactoryIcon(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props}><path d="M3 21V11l5 3v-3l5 3V8l5 3v10H3Z" /><path d="M6 21v-4m4 4v-4m4 4v-4" /></Icon>;
}

export function ScaleIcon(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props}><path d="M12 3v18M7 21h10" /><path d="M4 7h6M14 7h6" /><path d="M4 7 2 12a2.5 2.5 0 0 0 5 0L4 7Z" /><path d="M20 7l-2 5a2.5 2.5 0 0 0 5 0l-3-5Z" /></Icon>;
}

export function CupIcon(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props}><path d="M5 8h11v6a5 5 0 0 1-5 5H9a4 4 0 0 1-4-4V8Z" /><path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8 3c0 1-1 1-1 2m5-2c0 1-1 1-1 2" /></Icon>;
}

export function LeafIcon(props: SVGProps<SVGSVGElement>) {
  return <Icon {...props}><path d="M5 20c9 0 14-5 14-14 0 0-13-2-14 9-.4 3 0 5 0 5Z" /><path d="M5 20c0-6 3-9 6-11" /></Icon>;
}

export function CandidateBarChart({ label = "候補外 → 候補入り" }: { label?: string }) {
  return (
    <svg viewBox="0 0 90 46" role="img" aria-label={label} className="candidate-bar-chart">
      <line x1="2" y1="40" x2="88" y2="40" stroke="var(--border)" strokeWidth="1" />
      <rect x="14" y="24" width="16" height="16" rx="2" fill="var(--warn)" opacity=".75" />
      <text x="22" y="19" textAnchor="middle" fontSize="8" fill="var(--warn)" fontWeight="700">前</text>
      <path d="M36 32h14" stroke="var(--border-strong)" strokeWidth="1.5" markerEnd="url(#arrowhead-bar)" />
      <rect x="58" y="10" width="16" height="30" rx="2" fill="var(--brand)" />
      <text x="66" y="5" textAnchor="middle" fontSize="8" fill="var(--brand)" fontWeight="700">後</text>
      <defs>
        <marker id="arrowhead-bar" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill="var(--border-strong)" />
        </marker>
      </defs>
    </svg>
  );
}
