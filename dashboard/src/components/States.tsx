import type { ActivityEvent } from "../lib/api";
import { Avatar } from "./Avatar";
import { fmtRelative } from "../lib/format";
import { IconActivity, IconCheck, IconHeart, IconPulse } from "./icons";
import { Link } from "react-router-dom";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="grid h-48 place-items-center">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
        {label}
      </div>
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card-pad text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-3">
          Retry
        </button>
      )}
    </div>
  );
}

const EVENT_META: Record<ActivityEvent["type"], { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  session: { label: "Session", cls: "bg-brand-50 text-brand-600", Icon: IconPulse },
  analysis: { label: "Self-analysis", cls: "bg-sky-50 text-sky-600", Icon: IconActivity },
  homework: { label: "Homework", cls: "bg-amber-50 text-amber-600", Icon: IconHeart },
  homework_done: { label: "Completed", cls: "bg-emerald-50 text-emerald-600", Icon: IconCheck },
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (!events.length) {
    return <div className="grid h-32 place-items-center text-sm text-gray-400">No activity yet</div>;
  }
  return (
    <ul className="divide-y divide-line">
      {events.map((e, i) => {
        const meta = EVENT_META[e.type] ?? EVENT_META.session;
        const { Icon } = meta;
        return (
          <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meta.cls}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Link
                  to={`/users/${encodeURIComponent(e.userId)}`}
                  className="truncate text-sm font-semibold text-gray-900 hover:text-brand-600"
                >
                  {e.who}
                </Link>
                <span className="shrink-0 text-xs text-gray-400">{fmtRelative(e.at)}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{e.detail}</p>
            </div>
            <Avatar seed={e.userId} label={e.who} size="sm" />
          </li>
        );
      })}
    </ul>
  );
}
