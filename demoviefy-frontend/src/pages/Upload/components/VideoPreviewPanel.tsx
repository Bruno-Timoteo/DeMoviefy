import { useState, type RefObject } from "react"
import { formatDurationText } from "../utils/helpers"
import type { VideoAnalysisSummary, VideoRecord } from "../types"

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
            <strong>Video enviado</strong>
            <small>{formatDurationText(summary?.video_duration_sec)}</small>
          </div>
          {video.storage.video_exists ? (
            <video ref={videoRef} className="video-preview" controls preload="metadata" src={originalVideoSrc}>
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
              <strong>
                {annotatedPlaybackError
                  ? "Nao foi possivel reproduzir o video anotado."
                  : "Video anotado ainda nao disponivel."}
              </strong>
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
    </>
  )
}