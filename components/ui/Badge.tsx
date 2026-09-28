import type { ReactNode } from "react";

export function Badge({
  tone = "info",
  children,
  className = "",
}: {
  tone?: "info" | "warn" | "success";
  children?: ReactNode;
  className?: string;
}) {
  const toneClass = tone !== "info" ? ` ui-badge--${tone}` : "";
  return <span className={`ui-badge${toneClass}${className ? ` ${className}` : ""}`}>{children}</span>;
}
