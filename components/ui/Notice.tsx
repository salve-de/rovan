import type { ReactNode } from "react";

export function Notice({
  tone = "info",
  children,
  className = "",
}: {
  tone?: "info" | "warn" | "success";
  children?: ReactNode;
  className?: string;
}) {
  const toneClass = tone !== "info" ? ` ui-notice--${tone}` : "";
  return <div className={`ui-notice${toneClass}${className ? ` ${className}` : ""}`}>{children}</div>;
}
