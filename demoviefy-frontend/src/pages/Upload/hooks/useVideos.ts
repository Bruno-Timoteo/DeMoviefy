import { useCallback, useEffect, useMemo, useState } from "react"
import { VideoService } from "src/pages/Upload/services/videoService"
import type { VideoRecord } from "src/pages/Upload/types"

export function useVideos(compatibilityStatus: string) {
    const [videos, setVideos] = useState<VideoRecord[]>([])
    const [loadingVideos, setLoadingVideos] = useState(false)
    const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null)
    const [hint, setHint] = useState("")

    const fetchVideos = useCallback(async (options?: { preserveHint?: boolean; silent?: boolean }) => {
        const preserveHint = options?.preserveHint ?? true
        const silent = options?.silent ?? false

        if (!silent) setLoadingVideos(true)

        try {
            const normalizedVideos = await VideoService.listVideosNormalized()
            setVideos(normalizedVideos)
            setSelectedVideoId((current) => {
                if (normalizedVideos.length === 0 || current === null) return null
                return normalizedVideos.some((v) => v.id === current) ? current : null
            })
            if (!preserveHint) setHint(`Biblioteca atualizada com ${normalizedVideos.length} video(s).`)
        } catch (error) {
            console.error(error)
            setHint("Não foi possível atualizar a biblioteca.")
        } finally {
            if (!silent) setLoadingVideos(false)
        }
    }, [])

    useEffect(() => {
    if (compatibilityStatus !== "compatible") return

    const hasRunningAnalysis = videos.some((v) => v.status.startsWith("PROCESSANDO"))
    if (!hasRunningAnalysis) return

    const timer = window.setInterval(() => {
      void fetchVideos({ silent: true })
    }, 7000)

    return () => window.clearInterval(timer)
  }, [compatibilityStatus, videos, fetchVideos])

  const selectedVideo = useMemo(
    () => videos.find((v) => v.id === selectedVideoId) ?? null,
    [videos, selectedVideoId]
  )

  const stats = useMemo(() => ({
    total: videos.length,
    processing: videos.filter((v) => v.status.startsWith("PROCESSANDO")).length,
    processed: videos.filter((v) => v.status === "PROCESSADO").length,
    errors: videos.filter((v) => v.status.startsWith("ERRO")).length,
  }), [videos])

  return {
    videos,
    loadingVideos,
    selectedVideoId,
    selectedVideo,
    stats,
    hint,
    setHint,
    setSelectedVideoId,
    fetchVideos,
  }
}