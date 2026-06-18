import { useCallback } from "react"
import { VideoService } from "../services/videoService"
import { prettifyJson, getApiErrorMessage } from "../utils/helpers"
import type { VideoRecord, VideoAnalysisResponse, VideoTranscriptionResponse } from "../types"

type UseWorkbenchActionsProps = {
  selectedVideo: VideoRecord | null
  selectedAnalysisVariantId: string | null
  analysisDraft: string
  transcriptionDraft: string
  setAnalysis: (analysis: VideoAnalysisResponse | null) => void
  setAnalysisDraft: (draft: string) => void
  setAnalysisState: (state: "idle" | "loading" | "ready" | "pending" | "error") => void
  setSelectedAnalysisVariantId: (id: string | null) => void
  setTranscription: (transcription: VideoTranscriptionResponse | null) => void
  setTranscriptionDraft: (draft: string) => void
  setTranscriptionMessage: (message: string) => void
  setMessage: (message: string) => void
  setHint: (hint: string) => void
  fetchVideos: () => Promise<void>
  fetchTranscription: (video: VideoRecord) => Promise<void>
  resetTranscription: () => void
  resetArtifactSignature: () => void
}

export function useWorkbenchActions({
  selectedVideo,
  selectedAnalysisVariantId,
  analysisDraft,
  transcriptionDraft,
  setAnalysis,
  setAnalysisDraft,
  setAnalysisState,
  setSelectedAnalysisVariantId,
  setTranscription,
  setTranscriptionDraft,
  setTranscriptionMessage,
  setMessage,
  setHint,
  fetchVideos,
  fetchTranscription,
  resetTranscription,
  resetArtifactSignature,
}: UseWorkbenchActionsProps) {
  
  const onSaveAnalysis = useCallback(async () => {
    if (!selectedVideo) return

    try {
      const parsed = JSON.parse(analysisDraft)
      await VideoService.saveAnalysis(selectedVideo.id, parsed, selectedAnalysisVariantId)

      setAnalysis({
        video_id: selectedVideo.id,
        filename: selectedVideo.filename,
        status: selectedVideo.status,
        selected_variant_id: selectedAnalysisVariantId,
        available_variants: [], // Se precisar manter os originais, o ideal é passar no hook
        ai_config: selectedVideo.ai_config,
        storage: selectedVideo.storage,
        analysis: parsed,
      })
      setAnalysisDraft(prettifyJson(parsed))
      setAnalysisState("ready")
      setMessage("Analise salva com sucesso.")
      await fetchVideos()
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "JSON invalido ou erro ao salvar a analise."))
    }
  }, [selectedVideo, analysisDraft, selectedAnalysisVariantId, fetchVideos, setAnalysis, setAnalysisDraft, setAnalysisState, setMessage])

  const onDeleteAnalysis = useCallback(async () => {
    if (!selectedVideo) return

    try {
      await VideoService.deleteAnalysis(selectedVideo.id, selectedAnalysisVariantId)
      setAnalysis(null)
      setSelectedAnalysisVariantId(null)
      setAnalysisDraft("{}")
      setAnalysisState("error")
      setMessage(selectedAnalysisVariantId ? "Versao da analise excluida." : "Analise excluida.")
      await fetchVideos()
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir a analise."))
    }
  }, [selectedVideo, selectedAnalysisVariantId, fetchVideos, setAnalysis, setSelectedAnalysisVariantId, setAnalysisDraft, setAnalysisState, setMessage])

  const onDeleteVideo = useCallback(async () => {
    if (!selectedVideo) return

    try {
      await VideoService.deleteVideo(selectedVideo.id)
      setMessage("Video removido com sucesso.")
      setHint("O arquivo enviado e os artefatos associados foram removidos.")
      setAnalysis(null)
      setAnalysisDraft("{}")
      resetTranscription()
      resetArtifactSignature()
      await fetchVideos()
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir o video."))
    }
  }, [selectedVideo, fetchVideos, setMessage, setHint, setAnalysis, setAnalysisDraft, resetTranscription, resetArtifactSignature])

  const onSaveTranscription = useCallback(async () => {
    if (!selectedVideo) return

    try {
      await VideoService.saveTranscription(selectedVideo.id, transcriptionDraft)
      setMessage("Transcricao salva com sucesso.")
      await fetchVideos()
      await fetchTranscription(selectedVideo)
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "Nao foi possivel salvar a transcricao."))
    }
  }, [selectedVideo, transcriptionDraft, fetchVideos, fetchTranscription, setMessage])

  const onDeleteTranscription = useCallback(async () => {
    if (!selectedVideo) return

    try {
      await VideoService.deleteTranscription(selectedVideo.id)
      setTranscription(null)
      setTranscriptionDraft("")
      setTranscriptionMessage("Transcricao removida. Voce pode criar uma nova quando quiser.")
      setMessage("Transcricao excluida.")
      await fetchVideos()
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir a transcricao."))
    }
  }, [selectedVideo, fetchVideos, setTranscription, setTranscriptionDraft, setTranscriptionMessage, setMessage])

  const onGenerateTranscription = useCallback(async () => {
    if (!selectedVideo) return

    try {
      setTranscriptionMessage("Gerando transcricao automatica. Isso pode levar alguns instantes.")
      const { message: apiMessage } = await VideoService.generateTranscription(selectedVideo.id)
      setMessage(apiMessage)
      await fetchVideos()
      await fetchTranscription(selectedVideo)
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "Nao foi possivel gerar a transcricao automatica. Verifique o Whisper e o ffmpeg."))
    }
  }, [selectedVideo, fetchVideos, fetchTranscription, setTranscriptionMessage, setMessage])

  return {
    onSaveAnalysis,
    onDeleteAnalysis,
    onDeleteVideo,
    onSaveTranscription,
    onDeleteTranscription,
    onGenerateTranscription,
  }
}