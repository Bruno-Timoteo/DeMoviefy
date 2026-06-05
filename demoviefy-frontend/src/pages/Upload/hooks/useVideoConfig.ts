import { useCallback, useEffect, useState } from "react"
import { VideoService } from "../services/videoService"
import type { AIModelOption, VideoRecord } from "../types"
import { getApiErrorMessage, chooseFirstModel } from "../utils/helpers"

export function useVideoConfig(
  selectedVideo: VideoRecord | null,
  fetchVideos: () => Promise<void>,
  models: AIModelOption[],
  setMessage: (message: string) => void,
  setHint: (hint: string) => void,
) {
  const [videoTask, setVideoTask] = useState("object_detection")
  const [videoModelPath, setVideoModelPath] = useState("")
  const [videoFrameStride, setVideoFrameStride] = useState("8")
  const [videoConfidenceThreshold, setVideoConfidenceThreshold] = useState("0.35")
  const [videoMaxFrames, setVideoMaxFrames] = useState("300")
  const [videoClipStart, setVideoClipStart] = useState("0")
  const [videoClipEnd, setVideoClipEnd] = useState("")

  // Sincroniza estados com o vídeo selecionado
  useEffect(() => {
    if (!selectedVideo) return
    setVideoTask(selectedVideo.ai_config.task_type)
    setVideoModelPath(selectedVideo.ai_config.model_relative_path)
    setVideoFrameStride(String(selectedVideo.ai_config.frame_stride ?? 8))
    setVideoConfidenceThreshold(String(selectedVideo.ai_config.confidence_threshold ?? 0.35))
    setVideoMaxFrames(String(selectedVideo.ai_config.max_frames ?? 300))
    setVideoClipStart(String(selectedVideo.ai_config.clip_start_sec ?? 0))
    setVideoClipEnd(
      selectedVideo.ai_config.clip_end_sec === null ? "" : String(selectedVideo.ai_config.clip_end_sec)
    )
  }, [selectedVideo])

  const handleVideoTaskChange = useCallback((taskType: string) => {
    setVideoTask(taskType)
    setVideoModelPath(chooseFirstModel(models, taskType))
  }, [models])

  const handleSaveConfig = useCallback(async () => {
    if (!selectedVideo) return
    try {
      await VideoService.saveAiConfig(selectedVideo.id, {
        task_type: videoTask,
        model_path: videoModelPath,
        frame_stride: videoFrameStride,
        confidence_threshold: videoConfidenceThreshold,
        max_frames: videoMaxFrames,
        clip_start_sec: videoClipStart,
        clip_end_sec: videoClipEnd.trim() ? videoClipEnd : null,
      })
      setMessage("Configuracao de IA salva para o video selecionado.")
      await fetchVideos()
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "Nao foi possivel salvar a configuracao de IA."))
    }
  }, [selectedVideo, videoTask, videoModelPath, videoFrameStride, videoConfidenceThreshold, videoMaxFrames, videoClipStart, videoClipEnd, fetchVideos, setMessage])

  const handleReprocess = useCallback(async () => {
    if (!selectedVideo) return
    try {
      await VideoService.reprocessVideo(selectedVideo.id, {
        task_type: videoTask,
        model_path: videoModelPath,
        frame_stride: videoFrameStride,
        confidence_threshold: videoConfidenceThreshold,
        max_frames: videoMaxFrames,
        clip_start_sec: videoClipStart,
        clip_end_sec: videoClipEnd.trim() ? videoClipEnd : null,
      })
      setMessage("Reprocessamento iniciado.")
      setHint("O video sera analisado novamente com a configuracao escolhida.")
      await fetchVideos()
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "Nao foi possivel iniciar o reprocessamento."))
    }
  }, [selectedVideo, videoTask, videoModelPath, videoFrameStride, videoConfidenceThreshold, videoMaxFrames, videoClipStart, videoClipEnd, fetchVideos, setMessage, setHint])

  return {
    videoTask,
    videoModelPath,
    setVideoModelPath,
    videoFrameStride,
    setVideoFrameStride,
    videoConfidenceThreshold,
    setVideoConfidenceThreshold,
    videoMaxFrames,
    setVideoMaxFrames,
    videoClipStart,
    setVideoClipStart,
    videoClipEnd,
    setVideoClipEnd,
    handleVideoTaskChange,
    handleSaveConfig,
    handleReprocess,
  }
}