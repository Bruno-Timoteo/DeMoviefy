import { useRef } from "react"
import { VideoService } from "../services/videoService" // Ajuste o caminho até o seu videoService
import type { VideoRecord } from "src/pages/Upload/types"

export function useVideoPlayer(
  video: VideoRecord | null,
  selectedAnalysisVariantId: string | null
) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const annotatedVideoSrc = video
    ? VideoService.getAnnotatedVideoUrl(video, selectedAnalysisVariantId)
    : ""

  const originalVideoSrc = video
    ? VideoService.getOriginalVideoUrl(video)
    : ""

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = seconds
    void videoRef.current.play().catch(() => undefined)
  }

  return {
    videoRef,
    annotatedVideoSrc,
    originalVideoSrc,
    seekTo,
  }
}