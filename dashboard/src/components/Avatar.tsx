import { initials } from "../lib/format";

const PALETTE = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({
  seed,
  label,
  size = "md",
}: {
  seed: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm" ? "h-7 w-7 text-[11px]" : size === "lg" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-semibold ${dim} ${colorFor(seed)}`}
    >
      {initials(label ?? seed)}
    </span>
  );
}
