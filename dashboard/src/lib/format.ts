export function fmtNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function fmtPercent(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n}%`;
}

// Compact relative time, e.g. "3m", "5h", "2d", "Apr 4".
export function fmtRelative(ts: number | null | undefined): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDate(value: string | number | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDayShort(day: string): string {
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initials(label: string): string {
  const parts = label.trim().split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
