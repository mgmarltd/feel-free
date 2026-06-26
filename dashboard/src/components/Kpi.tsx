import type { ReactNode } from "react";

export function Kpi({
  label,
  value,
  total,
  caption,
  icon,
}: {
  label: string;
  value: string;
  total?: string;
  caption?: string;
  icon: ReactNode;
}) {
  return (
    <div className="card-pad">
      <div className="flex items-center gap-2.5">
        <span className="icon-chip">{icon}</span>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
        {value}
        {total && <span className="text-2xl font-semibold text-gray-300"> / {total}</span>}
      </div>
      {caption && <div className="mt-1 text-xs text-gray-400">{caption}</div>}
    </div>
  );
}
