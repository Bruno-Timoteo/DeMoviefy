// components/DashboardProgressBar.tsx
import type { VideoRecord } from "src/pages/Upload/types"

interface DashboardProgressBarProps {
  uploading: boolean
  loadingVideos: boolean
  selectedVideo: VideoRecord | null
  selectedVideoIsBusy: boolean
}

export function DashboardProgressBar({ uploading, loadingVideos, selectedVideo, selectedVideoIsBusy }: DashboardProgressBarProps) {
  const processState = uploading
    ? { text: "Upload em andamento", progress: null }
    : loadingVideos
      ? { text: "Atualizando biblioteca", progress: null }
      : selectedVideoIsBusy && selectedVideo
        ? { text: `Processando video: ${selectedVideo.filename}`, progress: selectedVideo.processing.processing_progress }
        : null

  if (!processState) return null

  const value = processState.progress ?? 0

  return (
    <section className="surface site-progress-panel">
      <div className="site-progress-title">
        <strong>{processState.text}</strong>
        <span>{value ? `${value}%` : "..."}</span>
      </div>
      <div className="site-progress-bar" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </div>
    </section>
  )
}