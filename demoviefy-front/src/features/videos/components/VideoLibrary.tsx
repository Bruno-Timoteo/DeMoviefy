import { memo, useMemo } from "react";

import type { VideoRecord } from "../types";
import { isVideoInProcessingQueue } from "../videoStatus";
import { ProcessingProgress } from "./ProcessingProgress";
import { ProcessingQueuePanel } from "./ProcessingQueuePanel";
import { StatusBadge } from "./StatusBadge";

type VideoLibraryProps = {
  videos: VideoRecord[];
  selectedVideoId: number | null;
  loading: boolean;
  collapsed: boolean;
  onSelect: (videoId: number) => void;
  onToggleCollapse: () => void;
  onOpenUpload: () => void;
};

function formatDate(createdAt: string | null) {
  if (!createdAt) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function formatSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(1)}s`;
}

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M8 6.5v11l9-5.5-9-5.5Z" />
    </svg>
  );
}

function PanelIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.8">
      {collapsed ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
    </svg>
  );
}

export const VideoLibrary = memo(function VideoLibrary({
  videos,
  selectedVideoId,
  loading,
  collapsed,
  onSelect,
  onToggleCollapse,
  onOpenUpload,
}: VideoLibraryProps) {
  const queueCount = useMemo(() => videos.filter(isVideoInProcessingQueue).length, [videos]);

  if (collapsed) {
    return (
      <aside className="surface sticky top-5 flex min-h-[620px] flex-col items-center gap-3 rounded-[30px] px-3 py-4">
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_16px_32px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5"
          onClick={onToggleCollapse}
          title="Expandir biblioteca"
          aria-label="Expandir biblioteca"
        >
          <PanelIcon collapsed />
        </button>

        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-600 text-lg font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.26)] transition hover:-translate-y-0.5"
          onClick={onOpenUpload}
          title="Adicionar novo video"
          aria-label="Adicionar novo video"
        >
          +
        </button>

        <div className="mt-auto flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(148,163,184,0.14)] text-sm font-semibold text-[var(--text)]">
            {videos.length}
          </span>
          <span className="max-w-[76px] rounded-full bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-300">
            {queueCount} ativos
          </span>
          {loading && <span className="text-[11px] font-medium text-[var(--muted)]">Atualizando</span>}
        </div>
      </aside>
    );
  }

  return (
    <aside className="surface sticky top-5 flex max-h-[calc(100vh-40px)] flex-col rounded-[32px] p-4 xl:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">Biblioteca</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text)]">Videos</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Clique em um card para abrir o video na area principal.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:-translate-y-0.5"
            onClick={onToggleCollapse}
          >
            Recolher
          </button>
          <button
            type="button"
            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.26)] transition hover:-translate-y-0.5"
            onClick={onOpenUpload}
          >
            + Novo Video
          </button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-strong)] px-5 py-6 text-sm text-[var(--muted)]">
          <strong>Nenhum video enviado ainda.</strong>
          <p>Assim que o upload terminar, ele aparece aqui com status e caminho de armazenamento.</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-4">
              {videos.map((video) => {
                const isSelected = selectedVideoId === video.id;

                return (
                  <button
                    key={video.id}
                    type="button"
                    className={joinClasses(
                      "group w-full rounded-[28px] border p-3 text-left transition hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)]",
                      isSelected
                        ? "border-blue-500/25 bg-[var(--brand-soft)] shadow-[0_20px_46px_rgba(37,99,235,0.12)]"
                        : "border-[var(--border)] bg-[var(--surface-strong)]",
                    )}
                    onClick={() => onSelect(video.id)}
                    style={{ contentVisibility: "auto", containIntrinsicSize: "320px" }}
                  >
                    <div className="relative overflow-hidden rounded-[24px] bg-slate-950">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900/80" />
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-300/20 blur-3xl" />
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">
                        <span>Preview</span>
                        <span>#{video.id}</span>
                      </div>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-[0_18px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
                          <PlayIcon />
                        </span>
                      </span>
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent px-3 pb-3 pt-8 text-xs text-white/78">
                        <span className="truncate">{video.ai_config.task_label}</span>
                        <span>{video.storage.annotated_exists ? "IA pronta" : "IA pendente"}</span>
                      </div>
                      <div className="h-32" aria-hidden="true" />
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-[var(--text)]" title={video.filename}>
                          {video.filename}
                        </strong>
                        <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(video.created_at)}</p>
                      </div>
                      <StatusBadge status={video.status} processing={video.processing} compact />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-[var(--muted)]">
                      <span className="rounded-full bg-[rgba(148,163,184,0.14)] px-2.5 py-1">
                        {video.analysis_ready ? "Resumo pronto" : "Resumo pendente"}
                      </span>
                      <span className="rounded-full bg-[rgba(148,163,184,0.14)] px-2.5 py-1">
                        {!video.storage.video_exists
                          ? "Arquivo ausente"
                          : video.transcription_ready
                            ? "Transcricao pronta"
                            : "Sem transcricao"}
                      </span>
                      <span className="rounded-full bg-[rgba(148,163,184,0.14)] px-2.5 py-1">
                        Trecho: {formatSeconds(video.ai_config.clip_start_sec)} - {video.ai_config.clip_end_sec === null ? "fim" : formatSeconds(video.ai_config.clip_end_sec)}
                      </span>
                      <span className="rounded-full bg-[rgba(148,163,184,0.14)] px-2.5 py-1">{video.ai_config.model_name}</span>
                    </div>

                    {video.status.startsWith("PROCESSANDO") && (
                      <div className="mt-3">
                        <ProcessingProgress
                          progress={video.processing.processing_progress}
                          stage={video.processing.processing_stage}
                          etaSeconds={video.processing.processing_eta_seconds}
                          message={video.processing.processing_message}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <ProcessingQueuePanel videos={videos} selectedVideoId={selectedVideoId} onSelect={onSelect} />
        </div>
      )}
      {loading && <span className="mt-3 text-xs font-medium text-[var(--muted)]">Atualizando biblioteca...</span>}
    </aside>
  );
});
