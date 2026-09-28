import type { ReactNode } from "react";

export function Section({
  background = "plain",
  eyebrow,
  title,
  lead,
  children,
  className = "",
}: {
  background?: "plain" | "surface";
  eyebrow?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ui-section${background === "surface" ? " ui-section--surface" : ""}${className ? ` ${className}` : ""}`}>
      <div className="shell">
        {(eyebrow || title || lead) && (
          <div className="ui-section__head">
            {eyebrow && <p className="overline">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
            {lead && <p>{lead}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
