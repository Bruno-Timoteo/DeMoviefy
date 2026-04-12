import { memo, useEffect, useRef, useState } from "react";

import { StatusBadge } from "./StatusBadge";
import { ProcessingProgress } from "./ProcessingProgress";
import type {
  AIModelOption,
  AITaskOption,
  VideoAnalysisResponse,
  VideoRecord,
  VideoTranscriptionResponse,
} from "../types";
import { toApiUrlWithQuery } from "../../../services/api";

type VideoWorkbenchProps = {
  video: VideoRecord | null;
  analysis: VideoAnalysisResponse | null;
  analysisState: "idle" | "loading" | "ready" | "pending" | "error";
  analysisMessage: string;
  selectedTask: string;
  selectedModelPath: string;
  selectedFrameStride: string;
  selectedConfidenceThreshold: string;
  selectedMaxFrames: string;
  selectedClipStart: string;
  selectedClipEnd: string;
  taskOptions: AITaskOption[];
  modelOptions: AIModelOption[];
  analysisDraft: string;
  transcription: VideoTranscriptionResponse | null;
  transcriptionDraft: string;
  transcriptionMessage: string;
  isBusy: boolean;
  onTaskChange: (taskType: string) => void;
  onModelChange: (modelPath: string) => void;
  onFrameStrideChange: (value: string) => void;
  onConfidenceThresholdChange: (value: string) => void;
  onMaxFramesChange: (value: string) => void;
  onClipStartChange: (value: string) => void;
  onClipEndChange: (value: string) => void;
  onAnalysisDraftChange: (value: string) => void;
  onTranscriptionDraftChange: (value: string) => void;
  onSaveConfig: () => void;
  onReprocess: () => void;
  onDeleteVideo: () => void;
  onSaveAnalysis: () => void;
  onDeleteAnalysis: () => void;
  onGenerateTranscription: () => void;
  onSaveTranscription: () => void;
  onDeleteTranscription: () => void;
};

function formatPercent(value: number | undefined) {
  if (typeof value !== "number") {
    return "-";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(1)}s`;
}

function formatDurationText(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Duracao indisponivel";
  }

  if (value < 1) {
    return `Duracao aproximada: ${value.toFixed(2)}s`;
  }

  return `Duracao aproximada: ${value.toFixed(1)}s`;
}

export const VideoWorkbench = memo(function VideoWorkbench({
  video,
  analysis,
  analysisState,
  analysisMessage,
  selectedTask,
  selectedModelPath,
  selectedFrameStride,
  selectedConfidenceThreshold,
  selectedMaxFrames,
  selectedClipStart,
  selectedClipEnd,
  taskOptions,
  modelOptions,
  analysisDraft,
  transcription,
  transcriptionDraft,
  transcriptionMessage,
  isBusy,
  onTaskChange,
  onModelChange,
  onFrameStrideChange,
  onConfidenceThresholdChange,
  onMaxFramesChange,
  onClipStartChange,
  onClipEndChange,
  onAnalysisDraftChange,
  onTranscriptionDraftChange,
  onSaveConfig,
  onReprocess,
  onDeleteVideo,
  onSaveAnalysis,
  onDeleteAnalysis,
  onGenerateTranscription,
  onSaveTranscription,
  onDeleteTranscription,
}: VideoWorkbenchProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [annotatedPlaybackError, setAnnotatedPlaybackError] = useState(false);

  const summary = analysis?.analysis ?? null;
  const filteredModels = modelOptions.filter((model) => model.task_type === selectedTask);
  const transcriptionSegments = transcription?.transcription.segments ?? [];
  const annotatedVideoSrc = video
    ? toApiUrlWithQuery(video.annotated_url, {
        v: video.storage.annotated_exists ? video.created_at ?? video.id : null,
        status: video.status,
        stride: video.ai_config.frame_stride,
        clip_start: video.ai_config.clip_start_sec,
        clip_end: video.ai_config.clip_end_sec ?? "end",
      })
    : "";
  const originalVideoSrc = video
    ? toApiUrlWithQuery(video.video_url, {
        v: video.created_at ?? video.id,
      })
    : "";

  useEffect(() => {
    setAnnotatedPlaybackError(false);
  }, [annotatedVideoSrc, video?.id]);

  if (!video) {
    return (
      <section className="surface inspector-panel empty-state">
        <strong>Selecione um video para editar os artefatos.</strong>
        <p>Aqui voce pode rever o preview, trocar o modelo e editar analise ou transcricao.</p>
      </section>
    );
  }

  const seekTo = (seconds: number) => {
    if (!videoRef.current) {
      return;
    }
    videoRef.current.currentTime = seconds;
    void videoRef.current.play().catch(() => undefined);
  };

  const formatTimecode = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const remaining = safe % 60;
    return hours > 0
      ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`
      : `${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <section className="surface inspector-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Workbench</span>
          <h2>{video.filename}</h2>
        </div>
        <StatusBadge status={video.status} processing={video.processing} />
      </div>

      {video.status.startsWith("PROCESSANDO") && (
        <ProcessingProgress
          progress={video.processing.processing_progress}
          stage={video.processing.processing_stage}
          etaSeconds={video.processing.processing_eta_seconds}
          message={video.processing.processing_message}
        />
      )}

      <div className="inspector-grid">
        <div className="media-panel">
          <div className="preview-grid">
            <article className="preview-card">
              <div className="preview-card-header">
                <span className="eyebrow">Original</span>
                <strong>Video enviado</strong>
                <small>{formatDurationText(summary?.video_duration_sec)}</small>
              </div>
              {video.storage.video_exists ? (
                <video
                  ref={videoRef}
                  className="video-preview"
                  controls
                  preload="metadata"
                  src={originalVideoSrc}
                >
                  Seu navegador nao suporta reproduzir este video.
                </video>
              ) : (
                <div className="empty-preview">
                  <strong>Arquivo de video nao encontrado.</strong>
                  <p>O registro ainda existe no banco, mas o arquivo nao esta mais em uploads/.</p>
                </div>
              )}
            </article>

            <article className="preview-card">
              <div className="preview-card-header">
                <span className="eyebrow">Marcacoes</span>
                <strong>Video anotado pela IA</strong>
                <small>{formatDurationText(summary?.video_duration_sec)}</small>
              </div>
              {video.storage.annotated_exists && !annotatedPlaybackError ? (
                <video
                  key={annotatedVideoSrc}
                  className="video-preview"
                  controls
                  preload="metadata"
                  src={annotatedVideoSrc}
                  onError={() => setAnnotatedPlaybackError(true)}
                >
                  Seu navegador nao suporta reproduzir este video.
                </video>
              ) : (
                <div className="empty-preview">
                  <strong>{annotatedPlaybackError ? "Nao foi possivel reproduzir o video anotado." : "Video anotado ainda nao disponivel."}</strong>
                  <p>
                    {annotatedPlaybackError
                      ? "O arquivo foi gerado, mas o navegador nao conseguiu abrir esse preview. Tente reprocessar o video ou baixar o arquivo salvo."
                      : analysisState === "pending"
                        ? "A IA ainda esta processando o arquivo. Quando terminar, o preview anotado aparece aqui."
                        : "Reprocesse o video para gerar um preview com marcacoes da IA."}
                  </p>
                  {video.storage.annotated_exists && (
                    <a className="ghost-button inline-link-button" href={annotatedVideoSrc} target="_blank" rel="noreferrer">
                      Abrir video anotado
                    </a>
                  )}
                </div>
              )}
            </article>
          </div>

          <div className="info-grid">
            <div className="info-card">
              <span>Video salvo em</span>
              <strong>{video.storage.video_relative_path}</strong>
              <small>{video.storage.video_absolute_path}</small>
            </div>
            <div className="info-card">
              <span>Resumo salvo em</span>
              <strong>{video.storage.analysis_relative_path}</strong>
              <small>{video.storage.analysis_absolute_path}</small>
            </div>
            <div className="info-card">
              <span>Video anotado salvo em</span>
              <strong>{video.storage.annotated_relative_path}</strong>
              <small>{video.storage.annotated_absolute_path}</small>
            </div>
            <div className="info-card">
              <span>Transcricao salva em</span>
              <strong>{video.storage.transcription_relative_path}</strong>
              <small>{video.storage.transcription_absolute_path}</small>
            </div>
          </div>
        </div>

        <div className="analysis-panel">
          <div className="analysis-state">
            <span className="eyebrow">Resumo</span>
            <p>{analysisMessage}</p>
          </div>

          {analysisState === "loading" && <div className="skeleton-block" />}

          {summary && (
            <div className="analysis-metrics">
              <div className="metric-card">
                <span>Deteccoes</span>
                <strong>{summary.total_detections}</strong>
              </div>
              <div className="metric-card">
                <span>Frames amostrados</span>
                <strong>{summary.sampled_frames}</strong>
              </div>
              <div className="metric-card">
                <span>Stride / limite</span>
                <strong>{summary.frame_stride} / {summary.max_frames}</strong>
              </div>
              <div className="metric-card">
                <span>Tarefa</span>
                <strong>{video.ai_config.task_label}</strong>
              </div>
              <div className="metric-card">
                <span>Modelo</span>
                <strong>{video.ai_config.model_name}</strong>
              </div>
              <div className="metric-card">
                <span>Trecho</span>
                <strong>
                  {formatSeconds(summary.clip_start_sec)} - {summary.clip_end_sec === null ? "fim" : formatSeconds(summary.clip_end_sec)}
                </strong>
              </div>
              <div className="metric-card">
                <span>Confianca minima</span>
                <strong>{typeof summary.confidence_threshold === "number" ? `${(summary.confidence_threshold * 100).toFixed(0)}%` : "-"}</strong>
              </div>
            </div>
          )}

          {summary && (
            <div className="label-table">
              <div className="label-table-header">
                <span>Classe</span>
                <span>Ocorrencias</span>
                <span>Confianca media</span>
              </div>
              {Object.keys(summary.label_counts).length === 0 && (
                <div className="label-table-row muted-row">
                  <span>Nenhuma deteccao encontrada</span>
                  <span>0</span>
                  <span>-</span>
                </div>
              )}
              {Object.entries(summary.label_counts).map(([label, count]) => (
                <div key={label} className="label-table-row">
                  <span>{label}</span>
                  <span>{count}</span>
                  <span>{formatPercent(summary.avg_confidence_by_label[label])}</span>
                </div>
              ))}
            </div>
          )}

          <div className="editor-grid">
            <section className="editor-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">IA</span>
                  <h3>Configuracao do video</h3>
                </div>
              </div>

              <div className="config-grid">
                <label className="field-block">
                  <span>Tarefa</span>
                  <select value={selectedTask} onChange={(event) => onTaskChange(event.target.value)}>
                    {taskOptions.map((task) => (
                      <option key={task.task_type} value={task.task_type}>
                        {task.task_label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-block">
                  <span>Modelo</span>
                  <select
                    value={selectedModelPath}
                    onChange={(event) => onModelChange(event.target.value)}
                  >
                    {filteredModels.map((model) => (
                      <option key={model.relative_path} value={model.relative_path}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-block">
                  <span>Stride de frames</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={selectedFrameStride}
                    onChange={(event) => onFrameStrideChange(event.target.value)}
                  />
                </label>

                <label className="field-block">
                  <span>Confianca minima</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedConfidenceThreshold}
                    onChange={(event) => onConfidenceThresholdChange(event.target.value)}
                  />
                </label>

                <label className="field-block">
                  <span>Maximo de frames</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={selectedMaxFrames}
                    onChange={(event) => onMaxFramesChange(event.target.value)}
                  />
                </label>

                <label className="field-block">
                  <span>Inicio da analise (s)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={selectedClipStart}
                    onChange={(event) => onClipStartChange(event.target.value)}
                  />
                </label>

                <label className="field-block">
                  <span>Fim da analise (s)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={selectedClipEnd}
                    onChange={(event) => onClipEndChange(event.target.value)}
                    placeholder="Vazio = ate o fim"
                  />
                </label>
              </div>
              <p className="field-help">
                Ajuste densidade, confianca e recorte para controlar exatamente como a IA vai analisar esse video.
              </p>

              <div className="action-row">
                <button type="button" className="ghost-button danger-button" onClick={onDeleteVideo}>
                  Excluir video
                </button>
                <button type="button" className="ghost-button" onClick={onSaveConfig} disabled={isBusy}>
                  Salvar configuracao
                </button>
                <button type="button" className="primary-button" onClick={onReprocess} disabled={isBusy}>
                  {isBusy
                    ? `Reprocessando... ${video.processing.processing_progress}%`
                    : "Reprocessar video"}
                </button>
              </div>
            </section>

            <section className="editor-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Analise</span>
                  <h3>JSON editavel</h3>
                </div>
              </div>
              <textarea
                className="editor-area"
                value={analysisDraft}
                onChange={(event) => onAnalysisDraftChange(event.target.value)}
                spellCheck={false}
              />
              <div className="action-row">
                <button type="button" className="ghost-button danger-button" onClick={onDeleteAnalysis}>
                  Excluir analise
                </button>
                <button type="button" className="primary-button" onClick={onSaveAnalysis} disabled={isBusy}>
                  Salvar analise
                </button>
              </div>
            </section>

            <section className="editor-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Transcricao</span>
                  <h3>Texto editavel</h3>
                </div>
              </div>
              <div className="action-row action-row-start">
                <button type="button" className="ghost-button" onClick={onGenerateTranscription} disabled={isBusy}>
                  {isBusy ? "Transcricao aguardando..." : "Gerar transcricao IA"}
                </button>
              </div>
              <textarea
                className="editor-area transcription-area"
                value={transcriptionDraft}
                onChange={(event) => onTranscriptionDraftChange(event.target.value)}
                placeholder="Cole ou escreva aqui a transcricao do video."
              />
              <p className="transcription-note">{transcriptionMessage}</p>
              {transcriptionSegments.length > 0 && (
                <div className="segment-list">
                  {transcriptionSegments.map((segment) => (
                    <button
                      key={`${segment.id}-${segment.start}`}
                      type="button"
                      className="segment-item"
                      onClick={() => seekTo(segment.start)}
                    >
                      <span className="segment-time">
                        {formatTimecode(segment.start)} - {formatTimecode(segment.end)}
                      </span>
                      <span className="segment-text">{segment.text}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="action-row">
                <button
                  type="button"
                  className="ghost-button danger-button"
                  onClick={onDeleteTranscription}
                  disabled={isBusy}
                >
                  Excluir transcricao
                </button>
                <button type="button" className="primary-button" onClick={onSaveTranscription} disabled={isBusy}>
                  Salvar transcricao
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
});
