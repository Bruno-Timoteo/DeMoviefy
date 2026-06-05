import { memo, useEffect, useRef, useState } from "react";

import { StatusBadge } from "./StatusBadge";
import { ProcessingProgress } from "./ProcessingProgress";
import type {
  AIModelOption,
  AITaskOption,
  VideoAnalysisResponse,
  VideoAnalysisVariant,
  VideoRecord,
  VideoTranscriptionResponse,
} from "../types"
import { toApiUrlWithQuery } from "../../../services/api";

import { VideoConfigPanel } from "./VideoConfigPanel";

type VideoWorkbenchProps = {
  video: VideoRecord | null;
  analysis: VideoAnalysisResponse | null;
  analysisState: "idle" | "loading" | "ready" | "pending" | "error";
  analysisMessage: string;
  selectedAnalysisVariantId: string | null;
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
  onAnalysisVariantChange: (variantId: string | null) => void;
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

function formatVariantLabel(variant: VideoAnalysisVariant) {
  const createdAt = variant.created_at ? new Date(variant.created_at).toLocaleString() : "Sem data";
  return `${variant.task_label} - ${variant.model_name} - ${createdAt}`;
}

export const VideoWorkbench = memo(function VideoWorkbench({
  video,
  analysis,
  analysisState,
  analysisMessage,
  selectedAnalysisVariantId,
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
  onAnalysisVariantChange,
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
  const analysisVariants = analysis?.available_variants ?? [];
  const hasMultipleAnalysisVariants = analysisVariants.length > 1;
  const transcriptionSegments = transcription?.transcription.segments ?? [];
  const annotatedVideoSrc = video
    ? toApiUrlWithQuery(video.annotated_url, {
        v: video.storage.annotated_exists ? video.created_at ?? video.id : null,
        status: video.status,
        stride: video.ai_config.frame_stride,
        clip_start: video.ai_config.clip_start_sec,
        clip_end: video.ai_config.clip_end_sec ?? "end",
        variant: selectedAnalysisVariantId,
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
        <StatusBadge status={video.status} />
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
                      ? "O preview anotado foi gerado, mas falhou ao abrir no navegador. Reprocesse o video para regenerar um MP4 compativel ou abra o arquivo salvo em uma nova guia."
                      : analysisState === "pending"
                        ? "A IA ainda esta processando o arquivo. Quando terminar, o preview anotado aparece aqui."
                        : "Ainda nao existe um preview anotado finalizado para este video. Reprocesse para gerar um MP4 anotado pronto para o navegador."}
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
            {analysisVariants.length > 0 && (
              <label className="field-block">
                <span>Versao da analise</span>
                <select
                  value={selectedAnalysisVariantId ?? ""}
                  onChange={(event) => onAnalysisVariantChange(event.target.value || null)}
                >
                  {analysisVariants.map((variant) => (
                    <option key={variant.variant_id} value={variant.variant_id}>
                      {formatVariantLabel(variant)}
                    </option>
                  ))}
                </select>
              </label>
            )}
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

            <VideoConfigPanel
                video={video}
                selectedTask={selectedTask}
                selectedModelPath={selectedModelPath}
                selectedFrameStride={selectedFrameStride}
                selectedConfidenceThreshold={selectedConfidenceThreshold}
                selectedMaxFrames={selectedMaxFrames}
                selectedClipStart={selectedClipStart}
                selectedClipEnd={selectedClipEnd}
                taskOptions={taskOptions}
                modelOptions={modelOptions}
                isBusy={isBusy}
                onTaskChange={onTaskChange}
                onModelChange={onModelChange}
                onFrameStrideChange={onFrameStrideChange}
                onConfidenceThresholdChange={onConfidenceThresholdChange}
                onMaxFramesChange={onMaxFramesChange}
                onClipStartChange={onClipStartChange}
                onClipEndChange={onClipEndChange}
                onSaveConfig={onSaveConfig}
                onReprocess={onReprocess}
                onDeleteVideo={onDeleteVideo}
            />

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
                  {hasMultipleAnalysisVariants ? "Excluir versao selecionada" : "Excluir analise"}
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
