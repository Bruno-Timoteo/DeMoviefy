// src/pages/Upload/components/VideoPreviewPanel.tsx

import { useState, type RefObject } from "react"
import { formatDurationText } from "src/pages/Upload/utils/helpers"
import type { VideoAnalysisSummary, VideoRecord } from "src/pages/Upload/types"

interface VideoPreviewPanelProps {
  video: VideoRecord
  summary: VideoAnalysisSummary | null
  analysisState: "idle" | "loading" | "ready" | "pending" | "error"
  originalVideoSrc: string
  annotatedVideoSrc: string
  videoRef: RefObject<HTMLVideoElement | null>
}

export function VideoPreviewPanel({
  video,
  summary,
  analysisState,
  originalVideoSrc,
  annotatedVideoSrc,
  videoRef,
}: VideoPreviewPanelProps) {
  const [annotatedPlaybackError, setAnnotatedPlaybackError] = useState(false)

  return (
    <>
      <div className="preview-grid">
        <article className="preview-card">
          <div className="preview-card-header">
            <span className="eyebrow">Original</span>
            <strong>Vídeo enviado</strong>
            <small>{formatDurationText(summary?.video_duration_sec)}</small>
          </div>
          {video.storage.video_exists ? (
            <video ref={videoRef} className="video-preview" controls preload="metadata" src={originalVideoSrc}>
              Seu navegador não suporta reproduzir este vídeo.
            </video>
          ) : (
            <div className="empty-preview">
              <strong>Arquivo de vídeo não encontrado.</strong>
              <p>O registro ainda existe no banco, mas o arquivo não esta mais em uploads/.</p>
            </div>
          )}
        </article>

        <article className="preview-card">
          <div className="preview-card-header">
            <span className="eyebrow">Marcações</span>
            <strong>Vídeo anotado pela IA</strong>
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
              Seu navegador não suporta reproduzir este vídeo.
            </video>
          ) : (
            <div className="empty-preview">
              <strong>
                {annotatedPlaybackError
                  ? "Não foi possível reproduzir o vídeo anotado."
                  : "Vídeo anotado ainda não disponível."}
              </strong>
              <p>
                {annotatedPlaybackError
                  ? "O preview anotado foi gerado, mas falhou ao abrir no navegador. Reprocesse o vídeo para regenerar um MP4 compatível ou abra o arquivo salvo em uma nova guia."
                  : analysisState === "pending"
                    ? "A IA ainda esta processando o arquivo. Quando terminar, o preview anotado aparece aqui."
                    : "Ainda não existe um preview anotado finalizado para este vídeo. Reprocesse para gerar um MP4 anotado pronto para o navegador."}
              </p>
              {video.storage.annotated_exists && (
                <a className="ghost-button inline-link-button" href={annotatedVideoSrc} target="_blank" rel="noreferrer">
                  Abrir vídeo anotado
                </a>
              )}
            </div>
          )}
        </article>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span>Vídeo salvo em</span>
          <strong>{video.storage.video_relative_path}</strong>
          <small>{video.storage.video_absolute_path}</small>
        </div>
        <div className="info-card">
          <span>Resumo salvo em</span>
          <strong>{video.storage.analysis_relative_path}</strong>
          <small>{video.storage.analysis_absolute_path}</small>
        </div>
        <div className="info-card">
          <span>Vídeo anotado salvo em</span>
          <strong>{video.storage.annotated_relative_path}</strong>
          <small>{video.storage.annotated_absolute_path}</small>
        </div>
        <div className="info-card">
          <span>Transcrição salva em</span>
          <strong>{video.storage.transcription_relative_path}</strong>
          <small>{video.storage.transcription_absolute_path}</small>
        </div>
      </div>
    </>
  )
}