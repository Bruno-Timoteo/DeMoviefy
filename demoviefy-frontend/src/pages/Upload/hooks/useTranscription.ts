// src/pages/Upload/hooks/useTranscription.ts
import { useCallback } from "react";
import { VideoService } from "../services/videoService";
import { useWorkbenchStore } from "../../../store/useWorkbenchStore";
import type { VideoRecord } from "../types";

export function useTranscription() {
  const fetchTranscription = useCallback(async (video: VideoRecord) => {
    // Puxando os setters diretamente da store global
    const { setTranscription, setTranscriptionDraft, setTranscriptionMessage } = useWorkbenchStore.getState();

    try {
      const { data, status } = await VideoService.getTranscription(video.transcription_url);
      setTranscription(data);
      setTranscriptionDraft(data.transcription.content ?? "");

      if (status === 200) {
        setTranscriptionMessage(
          data.transcription.status === "unavailable"
            ? data.transcription.error ?? "A transcrição automática não está disponível."
            : `Transcrição carregada de ${data.storage.transcription_relative_path}.`
        );
        return;
      }

      if (status === 202) {
        setTranscriptionMessage(data.transcription.error ?? "A transcrição ainda está em processamento.");
        return;
      }

      setTranscriptionMessage(data.transcription.error ?? "Ainda não existe transcrição salva.");
    } catch (error) {
      console.error(error);
      setTranscriptionMessage("Não foi possível carregar a transcrição.");
    }
  }, []);

  const resetTranscription = useCallback(() => {
    const { setTranscription, setTranscriptionDraft } = useWorkbenchStore.getState();
    setTranscription(null);
    setTranscriptionDraft("");
  }, []);

  // Agora ele só devolve as funções de ação
  return {
    fetchTranscription,
    resetTranscription,
  };
}