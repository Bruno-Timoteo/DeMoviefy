import { useCallback, useState } from "react"
import { VideoService } from "../services/videoService"
import type { VideoRecord, VideoTranscriptionResponse } from "../types"

export function useTranscription() {
  const [transcription, setTranscription] = useState<VideoTranscriptionResponse | null>(null)
  const [transcriptionDraft, setTranscriptionDraft] = useState("")
  const [transcriptionMessage, setTranscriptionMessage] = useState(
    "Use este campo para revisar, corrigir ou escrever a transcricao manualmente."
  )

  const fetchTranscription = useCallback(async (video: VideoRecord) => {
    try {
      const { data, status } = await VideoService.getTranscription(video.transcription_url)
      setTranscription(data)
      setTranscriptionDraft(data.transcription.content ?? "")

      if (status === 200) {
        setTranscriptionMessage(
          data.transcription.status === "unavailable"
            ? data.transcription.error ?? "A transcrição automática não está disponível."
            : `Transcrição carregada de ${data.storage.transcription_relative_path}.`
        )
        return
      }

      if (status === 202) {
        setTranscriptionMessage(data.transcription.error ?? "A transcrição ainda está em processamento.")
        return
      }

      setTranscriptionMessage(data.transcription.error ?? "Ainda não existe transcrição salva.")
    } catch (error) {
      console.error(error)
      setTranscriptionMessage("Não foi possível carregar a transcrição.")
    }
  }, [])

  const resetTranscription = useCallback(() => {
    setTranscription(null)
    setTranscriptionDraft("")
  }, [])

  return {
    transcription,
    setTranscription,
    transcriptionDraft,
    setTranscriptionDraft,
    transcriptionMessage,
    setTranscriptionMessage,
    fetchTranscription,
    resetTranscription,
  }
}