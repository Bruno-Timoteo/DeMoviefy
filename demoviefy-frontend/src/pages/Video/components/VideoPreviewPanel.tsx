// src/pages/Upload/components/VideoPreviewPanel.tsx

import { useState, useEffect, type RefObject } from "react"
import type { VideoRecord } from "src/pages/Upload/types"

interface VideoPreviewPanelProps {
  video: VideoRecord
  analysisState: "idle" | "loading" | "ready" | "pending" | "error"
  originalVideoSrc: string
  annotatedVideoSrc: string
  videoRef: RefObject<HTMLVideoElement | null>
  hasSelectedAnalysis: boolean
}

export function VideoPreviewPanel({
  video,
  analysisState,
  annotatedVideoSrc,
  hasSelectedAnalysis
}: VideoPreviewPanelProps) {
  const [annotatedPlaybackError, setAnnotatedPlaybackError] = useState(false)

  useEffect(() => {
    setAnnotatedPlaybackError(false);
    }, [annotatedVideoSrc, video?.id, video?.status]);
    const isReprocessing = video.status.startsWith("PROCESSANDO");
    const canTryAnnotated = (hasSelectedAnalysis || video.storage.annotated_exists) && !annotatedPlaybackError;
  
    return (
    <>
      <div className="preview-grid">

        <article className="preview-card">
          {canTryAnnotated ? (
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
                {annotatedPlaybackError && isReprocessing
                ? "Vídeo sendo reprocessado."
                : annotatedPlaybackError
                ? "Não foi possível reproduzir o vídeo anotado."
                : isReprocessing
                ? "Vídeo sendo reprocessado."
                : "Vídeo anotado ainda não disponível."}
            </strong>
            <p>
                {annotatedPlaybackError && isReprocessing
                ? "O vídeo está sendo reprocessado com uma nova configuração. O preview anotado estará disponível quando terminar."
                : annotatedPlaybackError
                ? "O preview anotado foi gerado, mas falhou ao abrir no navegador. Reprocesse o vídeo para regenerar um MP4 compatível ou abra o arquivo salvo em uma nova guia."
                : isReprocessing
                ? "O vídeo está sendo reprocessado com uma nova configuração. O preview anotado estará disponível quando terminar."
                : analysisState === "pending"
                ? "A IA ainda está processando o arquivo. Quando terminar, o preview anotado aparece aqui."
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