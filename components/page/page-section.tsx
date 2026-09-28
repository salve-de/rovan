import type { ReactNode } from "react";

/** ホームと同じ見せ方のセクション（小見出し＋大見出し＋一文＋中身）。背景は白・薄緑・紺の3種で交互に使う */
export function PageSection({
  id,
  tone = "white",
  eyebrow,
  title,
  lead,
  children,
  narrow = false,
}: {
  id?: string;
  tone?: "white" | "tint" | "navy";
  eyebrow?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  narrow?: boolean;
}) {
  return (
    <section id={id} className={`pg-section pg-section--${tone}`}>
      <div className={`shell pg-section-inner${narrow ? " pg-section-inner--narrow" : ""}`}>
        {eyebrow || title || lead ? (
          <div className="pg-section-head">
            {eyebrow ? <span className="pg-eyebrow">{eyebrow}</span> : null}
            {title ? <h2>{title}</h2> : null}
            {lead ? <p>{lead}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
