import { useCallback, useEffect, useState } from "react"
import { VideoService } from "../services/videoService"
import type { AiConfigPayload, AIModelOption, VideoRecord } from "../types"
import { getApiErrorMessage, chooseFirstModel } from "../utils/helpers"

export function useVideoConfig(
  selectedVideo: VideoRecord | null,
  fetchVideos: () => Promise<void>,
  models: AIModelOption[],
  setMessage: (message: string) => void,
  setHint: (hint: string) => void,
) {

  const [videoConfig, setVideoConfig] = useState<AiConfigPayload>({
    task_type: "object_detection",
    model_path: "",
    frame_stride: "8",
    confidence_threshold: "0.35",
    max_frames: "300",
    clip_start_sec: "0",
    clip_end_sec: null,
  })

  // Sincroniza estados com o vídeo selecionado
  useEffect(() => {
    if (!selectedVideo) return

    setVideoConfig({
      task_type: selectedVideo.ai_config.task_type,
      model_path: selectedVideo.ai_config.model_relative_path,
      frame_stride: String(selectedVideo.ai_config.frame_stride ?? 8),
      confidence_threshold: String(selectedVideo.ai_config.confidence_threshold ?? 0.35),
      max_frames: String(selectedVideo.ai_config.max_frames ?? 300),
      clip_start_sec: String(selectedVideo.ai_config.clip_start_sec ?? 0),
      clip_end_sec: selectedVideo.ai_config.clip_end_sec === null
        ? null
        : String(selectedVideo.ai_config.clip_end_sec),
    })
  }, [selectedVideo])

    const handleVideoTaskChange = useCallback((taskType: string) => {
        setVideoConfig((prev) => ({
            ...prev,
            task_type: taskType,
            model_path: chooseFirstModel(models, taskType),
        }))
    }, [models])

    const handleSaveConfig = useCallback(async () => {
        if (!selectedVideo) return
        try {
            await VideoService.saveAiConfig(selectedVideo.id, videoConfig)

            setMessage("Configuracao de IA salva para o video selecionado.")
            await fetchVideos()
        } catch (error) {
            console.error(error)
            setMessage(getApiErrorMessage(error, "Nao foi possivel salvar a configuracao de IA."))
        }
    }, [selectedVideo, videoConfig, fetchVideos, setMessage])

  const handleReprocess = useCallback(async () => {
    if (!selectedVideo) return
    try {
      await VideoService.reprocessVideo(selectedVideo.id, videoConfig)
      setMessage("Reprocessamento iniciado.")
      setHint("O vídeo sera analisado novamente com a configuração escolhida.")
      await fetchVideos()
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "Nao foi possivel iniciar o reprocessamento."))
    }
  }, [selectedVideo, videoConfig, fetchVideos, setMessage])

  return {
    videoConfig,
    setVideoConfig,
    handleVideoTaskChange,
    handleSaveConfig,
    handleReprocess,
  }
}