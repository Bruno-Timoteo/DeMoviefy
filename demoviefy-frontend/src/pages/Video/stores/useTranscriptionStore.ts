// src/pages/Video/stores/useTranscriptionStore.ts

import { create } from "zustand";
import { VideoService } from "src/pages/Upload/services/videoService";
import { getApiErrorMessage } from "src/pages/Upload/utils/helpers";
import { useVideoDetailStore } from "src/pages/Video/stores/useVideoDetailStore";
import type { VideoRecord, VideoTranscriptionResponse } from "src/pages/Upload/types";
import { toast } from "sonner";

interface TranscriptionState {
  transcription: VideoTranscriptionResponse | null;
  transcriptionDraft: string;
  transcriptionMessage: string;

  setTranscriptionDraft: (draft: string) => void;

  fetchTranscription: (video: VideoRecord) => Promise<void>;
  resetTranscription: () => void;
  onSaveTranscription: () => Promise<void>;
  onDeleteTranscription: () => Promise<void>;
  onGenerateTranscription: () => Promise<void>;
}

export const useTranscriptionStore = create<TranscriptionState>((set, get) => ({
  transcription: null,
  transcriptionDraft: "",
  transcriptionMessage: "",

  setTranscriptionDraft: (transcriptionDraft) => set({ transcriptionDraft }),

  fetchTranscription: async (video) => {
    try {
      const { data, status } = await VideoService.getTranscription(video.transcription_url);

      set({
        transcription: data,
        transcriptionDraft: data.transcription.content ?? "",
      });

      if (status === 200) {
        set({
          transcriptionMessage:
            data.transcription.status === "unavailable"
              ? data.transcription.error ?? "A transcrição automática não está disponível."
              : `Transcrição carregada de ${data.storage.transcription_relative_path}.`,
        });
        return;
      }

      if (status === 202) {
        set({ transcriptionMessage: data.transcription.error ?? "A transcrição ainda está em processamento." });
        return;
      }

      set({ transcriptionMessage: data.transcription.error ?? "Ainda não existe transcrição salva." });
    } catch (error) {
      console.error(error);
      set({ transcriptionMessage: "Não foi possível carregar a transcrição." });
    }
  },

  resetTranscription: () => {
    set({ transcription: null, transcriptionDraft: "" });
  },

  onSaveTranscription: async () => {
    const selectedVideo = useVideoDetailStore.getState().video;
    if (!selectedVideo) return;

    const { transcriptionDraft, fetchTranscription } = get();

    try {
      await VideoService.saveTranscription(selectedVideo.id, transcriptionDraft);
      toast.success("Transcrição salva com sucesso.");
      await useVideoDetailStore.getState().fetchVideoById(selectedVideo.id, { force: true});
      await fetchTranscription(selectedVideo);
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Não foi possível salvar a transcrição."));
    }
  },

  onDeleteTranscription: async () => {
    const selectedVideo = useVideoDetailStore.getState().video;
    if (!selectedVideo) return;


    try {
      await VideoService.deleteTranscription(selectedVideo.id);
      set({
        transcription: null,
        transcriptionDraft: "",
        transcriptionMessage: "Transcrição removida. Você pode criar uma nova quando quiser.",
      });
      toast.success("Transcrição excluída.");
      await useVideoDetailStore.getState().fetchVideoById(selectedVideo.id, { force: true});
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Não foi possível excluir a transcrição."));
    }
  },

  onGenerateTranscription: async () => {
    const selectedVideo = useVideoDetailStore.getState().video;
    if (!selectedVideo) return;

    const { fetchTranscription } = get();

    try {
      set({ transcriptionMessage: "Gerando transcrição automática. Isso pode levar alguns instantes." });
      const { message: apiMessage } = await VideoService.generateTranscription(selectedVideo.id);
      toast(apiMessage);
      await useVideoDetailStore.getState().fetchVideoById(selectedVideo.id, { force: true});
      await fetchTranscription(selectedVideo);
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Não foi possível gerar a transcrição automática. Verifique o Whisper e o ffmpeg."));
    }
  },
}));