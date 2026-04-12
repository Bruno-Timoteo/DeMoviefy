import { getVideoStatusMeta } from "../videoStatus";

type StatusBadgeProps = {
  status: string;
  processing?: {
    processing_progress?: number;
    processing_stage?: string | null;
  } | null;
  compact?: boolean;
  className?: string;
};

const BADGE_CLASSES = {
  ok: "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-600/15",
  processing: "bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20",
  queued: "bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/20",
  error: "bg-rose-500/12 text-rose-700 ring-1 ring-rose-500/20",
} as const;

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function StatusBadge({ status, processing, compact = false, className }: StatusBadgeProps) {
  const meta = getVideoStatusMeta(status, processing);
  const sizeClasses = compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <span
      className={joinClasses(
        "inline-flex items-center gap-2 rounded-full font-semibold whitespace-nowrap",
        BADGE_CLASSES[meta.tone],
        sizeClasses,
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
