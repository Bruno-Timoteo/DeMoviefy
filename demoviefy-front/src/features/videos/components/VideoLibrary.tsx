import { memo } from "react";

import { StatusBadge } from "./StatusBadge";
import { ProcessingProgress } from "./ProcessingProgress";
import type { VideoRecord } from "../types";

type VideoLibraryProps = {
  videos: VideoRecord[];
  selectedVideoId: number | null;
  loading: boolean;
  onSelect: (videoId: number) => void;
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

export const VideoLibrary = memo(function VideoLibrary({
  videos,
  selectedVideoId,
  loading,
  onSelect,
}: VideoLibraryProps) {
  return (
    <section className="surface library-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Biblioteca</span>
          <h2>Videos analisados</h2>
        </div>
        {loading && <span className="panel-state">Atualizando...</span>}
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhum video enviado ainda.</strong>
          <p>Assim que o upload terminar, ele aparece aqui com status e caminho de armazenamento.</p>
        </div>
      ) : (
        <div className="video-list">
          {videos.map((video) => (
            <button
              key={video.id}
              type="button"
              className={`video-card ${selectedVideoId === video.id ? "is-selected" : ""}`}
              onClick={() => onSelect(video.id)}
            >
              <div className="video-card-header">
                <strong title={video.filename}>{video.filename}</strong>
                <StatusBadge status={video.status} />
              </div>

              <div className="video-card-meta">
                <span>#{video.id}</span>
                <span>{formatDate(video.created_at)}</span>
              </div>

              <div className="video-card-footer">
                <span>{video.ai_config.model_name}</span>
                <span>{video.analysis_ready ? "Resumo pronto" : "Resumo pendente"}</span>
              </div>

              <div className="video-card-footer">
                <span>{video.ai_config.task_label}</span>
                <span>
                  {!video.storage.video_exists
                    ? "Arquivo ausente"
                    : video.transcription_ready
                      ? "Transcricao pronta"
                      : "Sem transcricao"}
                </span>
              </div>

              <div className="video-card-footer">
                <span>
                  Trecho: {formatSeconds(video.ai_config.clip_start_sec)} - {video.ai_config.clip_end_sec === null ? "fim" : formatSeconds(video.ai_config.clip_end_sec)}
                </span>
                <span>{video.storage.annotated_exists ? "Preview anotado pronto" : "Preview anotado pendente"}</span>
              </div>

              {video.status.startsWith("PROCESSANDO") && (
                <ProcessingProgress
                  progress={video.processing.processing_progress}
                  stage={video.processing.processing_stage}
                  etaSeconds={video.processing.processing_eta_seconds}
                  message={video.processing.processing_message}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
});
