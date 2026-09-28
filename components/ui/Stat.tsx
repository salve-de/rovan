import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  note,
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ui-stat${className ? ` ${className}` : ""}`}>
      <span className="ui-stat__label">{label}</span>
      <strong className="ui-stat__value">{value}</strong>
      {note && <span className="ui-stat__note">{note}</span>}
    </div>
  );
}
