// src/stores/useWorkbenchStore.ts

// pretendo fragmentar este arquivo em duas stores. useAnalysisStore e useTranscriptionStore

import { create } from "zustand";
import { VideoService } from "src/pages/Upload/services/videoService";
import { prettifyJson, getApiErrorMessage } from "src/pages/Upload/utils/helpers";
import { useUploadStore } from "src/stores/useUploadStore";
import type { VideoAnalysisResponse, VideoRecord, VideoTranscriptionResponse } from "src/pages/Upload/types";

interface WorkbenchState {
  analysis: VideoAnalysisResponse | null;
  analysisState: "idle" | "loading" | "ready" | "pending" | "error";
  analysisMessage: string;
  selectedAnalysisVariantId: string | null;
  analysisDraft: string;
  transcription: VideoTranscriptionResponse | null;
  transcriptionDraft: string;
  transcriptionMessage: string;

  // Setters básicos
  setAnalysis: (analysis: VideoAnalysisResponse | null) => void;
  setAnalysisState: (state: WorkbenchState["analysisState"]) => void;
  setAnalysisMessage: (msg: string) => void;
  setSelectedAnalysisVariantId: (id: string | null) => void;
  setAnalysisDraft: (draft: string) => void;
  setTranscription: (transcription: VideoTranscriptionResponse | null) => void;
  setTranscriptionDraft: (draft: string) => void;
  setTranscriptionMessage: (msg: string) => void;

  // Ações complexas (Antigo useWorkbenchActions)
  onSaveAnalysis: (selectedVideo: VideoRecord | null, fetchVideos: () => Promise<void>) => Promise<void>;
  onDeleteAnalysis: (selectedVideo: VideoRecord | null, fetchVideos: () => Promise<void>) => Promise<void>;
  onDeleteVideo: (
    selectedVideo: VideoRecord | null, 
    fetchVideos: () => Promise<void>, 
    resetArtifactSignature: () => void
  ) => Promise<void>;
  onSaveTranscription: (
    selectedVideo: VideoRecord | null, 
    fetchVideos: () => Promise<void>, 
    fetchTranscription: (video: VideoRecord) => Promise<void>
  ) => Promise<void>;
  onDeleteTranscription: (selectedVideo: VideoRecord | null, fetchVideos: () => Promise<void>) => Promise<void>;
  onGenerateTranscription: (
    selectedVideo: VideoRecord | null, 
    fetchVideos: () => Promise<void>, 
    fetchTranscription: (video: VideoRecord) => Promise<void>
  ) => Promise<void>;
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  analysis: null,
  analysisState: "idle",
  analysisMessage: "",
  selectedAnalysisVariantId: null,
  analysisDraft: "{}",
  transcription: null,
  transcriptionDraft: "",
  transcriptionMessage: "",

  setAnalysis: (analysis) => set({ analysis }),
  setAnalysisState: (analysisState) => set({ analysisState }),
  setAnalysisMessage: (analysisMessage) => set({ analysisMessage }),
  
  // CORREÇÃO 1: Usando 'id' para evitar confusão de nomes
  setSelectedAnalysisVariantId: (id) => set({ selectedAnalysisVariantId: id }),
  
  setAnalysisDraft: (analysisDraft) => set({ analysisDraft }),
  setTranscription: (transcription) => set({ transcription }),
  setTranscriptionDraft: (transcriptionDraft) => set({ transcriptionDraft }),
  setTranscriptionMessage: (transcriptionMessage) => set({ transcriptionMessage }),

  onSaveAnalysis: async (selectedVideo, fetchVideos) => {
    if (!selectedVideo) return;
    const { analysisDraft, selectedAnalysisVariantId, analysis } = get();
    const { setMessage } = useUploadStore.getState();

    try {
      const parsed = JSON.parse(analysisDraft);
      await VideoService.saveAnalysis(selectedVideo.id, parsed, selectedAnalysisVariantId);

      set({
        analysis: {
          video_id: selectedVideo.id,
          filename: selectedVideo.filename,
          status: selectedVideo.status,
          selected_variant_id: selectedAnalysisVariantId,
          available_variants: analysis?.available_variants ?? [],
          ai_config: selectedVideo.ai_config,
          storage: selectedVideo.storage,
          analysis: parsed,
        },
        analysisDraft: prettifyJson(parsed),
        analysisState: "ready",
      });
      setMessage("Análise salva com sucesso.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "JSON inválido ou erro ao salvar a análise."));
    }
  },

  onDeleteAnalysis: async (selectedVideo, fetchVideos) => {
    if (!selectedVideo) return;
    const { selectedAnalysisVariantId } = get();
    const { setMessage } = useUploadStore.getState();

    try {
      await VideoService.deleteAnalysis(selectedVideo.id, selectedAnalysisVariantId);
      set({
        analysis: null,
        // CORREÇÃO 2: Aqui é a variável (selectedAnalysisVariantId) e não a função (set...)
        selectedAnalysisVariantId: null,
        analysisDraft: "{}",
        analysisState: "error",
      });
      setMessage(selectedAnalysisVariantId ? "Versão da análise excluída." : "Análise excluída.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Não foi possível excluir a análise."));
    }
  },

  onDeleteVideo: async (selectedVideo, fetchVideos, resetArtifactSignature) => {
    if (!selectedVideo) return;
    const { setMessage, setHint } = useUploadStore.getState();

    try {
      await VideoService.deleteVideo(selectedVideo.id);
      setMessage("Vídeo removido com sucesso.");
      setHint("O arquivo enviado e os artefatos associados foram removidos.");
      set({
        analysis: null,
        analysisDraft: "{}",
        transcription: null,
        transcriptionDraft: "",
        transcriptionMessage: "Transcrição removida.",
      });
      resetArtifactSignature();
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Não foi possível excluir o vídeo."));
    }
  },

  onSaveTranscription: async (selectedVideo, fetchVideos, fetchTranscription) => {
    if (!selectedVideo) return;
    const { transcriptionDraft } = get();
    const { setMessage } = useUploadStore.getState();

    try {
      await VideoService.saveTranscription(selectedVideo.id, transcriptionDraft);
      setMessage("Transcrição salva com sucesso.");
      await fetchVideos();
      await fetchTranscription(selectedVideo);
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Não foi possível salvar a transcrição."));
    }
  },

  onDeleteTranscription: async (selectedVideo, fetchVideos) => {
    if (!selectedVideo) return;
    const { setMessage } = useUploadStore.getState();

    try {
      await VideoService.deleteTranscription(selectedVideo.id);
      set({
        transcription: null,
        transcriptionDraft: "",
        transcriptionMessage: "Transcrição removida. Você pode criar uma nova quando quiser.",
      });
      setMessage("Transcrição excluída.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Não foi possível excluir a transcrição."));
    }
  },

  onGenerateTranscription: async (selectedVideo, fetchVideos, fetchTranscription) => {
    if (!selectedVideo) return;
    const { setMessage } = useUploadStore.getState();

    try {
      set({ transcriptionMessage: "Gerando transcrição automática. Isso pode levar alguns instantes." });
      const { message: apiMessage } = await VideoService.generateTranscription(selectedVideo.id);
      setMessage(apiMessage);
      await fetchVideos();
      await fetchTranscription(selectedVideo);
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Não foi possível gerar a transcrição automática. Verifique o Whisper e o ffmpeg."));
    }
  },
}));