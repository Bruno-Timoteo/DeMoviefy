import { memo } from "react";
import { Link } from "react-router-dom";

import { ProcessingProgress } from "src/core/components/ProcessingProgress";
import { StatusBadge } from "src/core/components/StatusBadge";
import type { VideoRecord } from "src/core/types/videoTypes";

type VideoLibraryProps = {
  videos: VideoRecord[];
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

function getStatusStyles(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (status.startsWith("PROCESSANDO")) {
    return "bg-blue-50 hover:bg-blue-100";
  }

  if (
    normalizedStatus.includes("erro") ||
    normalizedStatus.includes("falha")
  ) {
    return "bg-red-50 hover:bg-red-100";
  }

  if (
    normalizedStatus.includes("concluído") ||
    normalizedStatus.includes("concluido")
  ) {
    return "bg-green-50 hover:bg-green-100";
  }

  if (
    normalizedStatus.includes("aguardando") ||
    normalizedStatus.includes("pendente")
  ) {
    return "bg-amber-50 hover:bg-amber-100";
  }

  return "bg-neutral-50 hover:bg-neutral-100";
}

export const VideoLibrary = memo(function VideoLibrary({
  videos,
}: VideoLibraryProps) {
  return (
    <section className="px-4 pb-6">

      {videos.length === 0 ? (
        <div className="px-2 py-4">
          <strong className="text-sm font-medium text-neutral-900">
            Nenhum vídeo enviado ainda.
          </strong>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Assim que o upload terminar, ele aparecerá aqui com status e
            caminho de armazenamento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <Link
              key={video.id}
              to={`/video/${video.id}`}
              className={`group block rounded-lg px-4 py-4 transition ${getStatusStyles(
                video.status,
              )}`}
            >
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <strong
                    title={video.filename}
                    className="min-w-0 truncate text-sm font-medium text-neutral-900"
                  >
                    {video.filename}
                  </strong>

                  <StatusBadge status={video.status} />
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                  <span>#{video.id}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">
                    {formatDate(video.created_at)}
                  </span>
                </div>

                <div className="mt-3 border-t border-neutral-200/70 pt-3">
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-neutral-700">
                      {video.ai_config.model_name}
                    </span>

                    <span className="shrink-0 text-neutral-500">
                      {video.analysis_ready
                        ? "Resumo pronto"
                        : "Resumo pendente"}
                    </span>
                  </div>

                  <div className="mt-1.5 flex justify-between gap-3 text-xs">
                    <span className="truncate text-neutral-500">
                      {video.ai_config.task_label}
                    </span>

                    <span className="shrink-0 text-neutral-500">
                      {!video.storage.video_exists
                        ? "Arquivo ausente"
                        : video.transcription_ready
                          ? "Transcrição pronta"
                          : "Sem transcrição"}
                    </span>
                  </div>

                  <div className="mt-1.5 flex justify-between gap-3 text-xs text-neutral-500">
                    <span className="truncate">
                      Trecho:{" "}
                      {formatSeconds(video.ai_config.clip_start_sec)} -{" "}
                      {video.ai_config.clip_end_sec === null
                        ? "fim"
                        : formatSeconds(video.ai_config.clip_end_sec)}
                    </span>

                    <span className="shrink-0">
                      {video.storage.annotated_exists
                        ? "Preview anotado pronto"
                        : "Preview anotado pendente"}
                    </span>
                  </div>
                </div>

                {video.status.startsWith("PROCESSANDO") && (
                  <div className="mt-4">
                    <ProcessingProgress
                      progress={video.processing.processing_progress}
                      stage={video.processing.processing_stage}
                      etaSeconds={video.processing.processing_eta_seconds}
                      message={video.processing.processing_message}
                    />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
});
