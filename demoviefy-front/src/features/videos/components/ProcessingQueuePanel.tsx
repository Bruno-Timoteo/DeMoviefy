import { memo, useMemo, useState } from "react";

import type { VideoRecord } from "../types";
import { getVideoStatusMeta, isVideoInProcessingQueue } from "../videoStatus";
import { StatusBadge } from "./StatusBadge";

type ProcessingQueuePanelProps = {
  videos: VideoRecord[];
  selectedVideoId: number | null;
  onSelect: (videoId: number) => void;
};

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

const PROGRESS_TONE_CLASSES = {
  queued: "bg-sky-500",
  processing: "bg-amber-500",
  ok: "bg-emerald-500",
  error: "bg-rose-500",
} as const;

export const ProcessingQueuePanel = memo(function ProcessingQueuePanel({
  videos,
  selectedVideoId,
  onSelect,
}: ProcessingQueuePanelProps) {
  const [expanded, setExpanded] = useState(true);

  const queueVideos = useMemo(() => videos.filter(isVideoInProcessingQueue), [videos]);

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setExpanded((current) => !current)}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Fila de Processamento
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--text)]">
            {queueVideos.length === 0 ? "Nenhum item pendente" : `${queueVideos.length} video(s) em andamento`}
          </h3>
        </div>
        <span className="rounded-full bg-[rgba(148,163,184,0.14)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
          {expanded ? "Ocultar" : "Mostrar"}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {queueVideos.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-strong)] px-4 py-5 text-sm text-[var(--muted)]">
              A fila aparece aqui quando houver videos aguardando ou processando.
            </div>
          ) : (
            queueVideos.map((video) => {
              const meta = getVideoStatusMeta(video.status, video.processing);
              const progress = Math.max(video.processing.processing_progress, meta.tone === "queued" ? 8 : 16);
              const isSelected = selectedVideoId === video.id;

              return (
                <button
                  key={video.id}
                  type="button"
                  className={joinClasses(
                    "w-full rounded-[20px] border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
                    isSelected
                      ? "border-blue-500/30 bg-[var(--brand-soft)]"
                      : "border-[var(--border)] bg-[var(--surface-strong)]",
                  )}
                  onClick={() => onSelect(video.id)}
                  style={{ contentVisibility: "auto", containIntrinsicSize: "112px" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">{video.filename}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{video.processing.processing_message ?? "Aguardando atualizacao do backend."}</p>
                    </div>
                    <StatusBadge status={video.status} processing={video.processing} compact />
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.14)]">
                    <span
                      className={joinClasses(
                        "block h-full rounded-full transition-[width] duration-300",
                        PROGRESS_TONE_CLASSES[meta.tone],
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--muted)]">
                    <span>#{video.id}</span>
                    <span>{video.processing.processing_progress}%</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </section>
  );
});
