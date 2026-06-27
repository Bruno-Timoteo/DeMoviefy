// src/core/stores/useAnalysisStore.ts

import { create } from "zustand";
import { VideoService } from "src/pages/Upload/services/videoService";
import { prettifyJson, getApiErrorMessage, buildArtifactSignature } from "src/pages/Upload/utils/helpers";
import { useVideoDetailStore } from "src/core/stores/useVideoDetailStore";
import { useUploadStore } from "src/core/stores/useUploadStore";
import { useTranscriptionStore } from "src/core/stores/useTranscriptionStore";
import type { VideoAnalysisResponse } from "src/pages/Upload/types";

type AnalysisStatus = "idle" | "loading" | "ready" | "pending" | "error";

interface AnalysisState {
  analysis: VideoAnalysisResponse | null;
  analysisState: AnalysisStatus;
  analysisMessage: string;
  selectedAnalysisVariantId: string | null;
  analysisDraft: string;

  setAnalysisDraft: (draft: string) => void;
  setSelectedAnalysisVariantId: (id: string | null) => void;

  // Substitui o useEffect de useAnalysis.ts: chamada explícita sempre que
  // selectedVideo ou selectedAnalysisVariantId mudam.
  syncAnalysisWithSelectedVideo: () => Promise<void>;

  onSaveAnalysis: () => Promise<void>;
  onDeleteAnalysis: () => Promise<void>;
  onDeleteVideo: () => Promise<void>;

  resetArtifactSignature: () => void;
}

// Variável de módulo: substitui o lastArtifactSignatureRef do hook original.
// Não é state porque não deve disparar re-render nem aparecer no devtools como dado de UI —
// é puramente um mecanismo de controle para não refazer fetch duplicado.
let lastArtifactSignature = "";

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analysis: null,
  analysisState: "idle",
  analysisMessage: "",
  selectedAnalysisVariantId: null,
  analysisDraft: "{}",

  setAnalysisDraft: (analysisDraft) => set({ analysisDraft }),

  setSelectedAnalysisVariantId: (id) => {
    set({ selectedAnalysisVariantId: id });
    // No hook original, mudar o variant disparava o useEffect de novo (estava nas deps).
    // Aqui replicamos isso chamando o sync manualmente após trocar o id.
    void get().syncAnalysisWithSelectedVideo();
  },

  syncAnalysisWithSelectedVideo: async () => {
    const selectedVideo = useVideoDetailStore.getState().video;
    const { selectedAnalysisVariantId } = get();

    if (!selectedVideo) {
      set({
        analysis: null,
        selectedAnalysisVariantId: null,
        analysisState: "idle",
        analysisDraft: "{}",
      });
      lastArtifactSignature = "";
      return;
    }

    const currentSignature = buildArtifactSignature(selectedVideo, selectedAnalysisVariantId);
    if (lastArtifactSignature === currentSignature) return;
    lastArtifactSignature = currentSignature;

    set({ analysisState: "loading" });

    try {
      const { data: normalizedVideoAnalysis, status } = await VideoService.getNormalizedVideoAnalysis(
        selectedVideo.analysis_url,
        selectedAnalysisVariantId
      );

      set({ analysis: normalizedVideoAnalysis });

      if (
        normalizedVideoAnalysis?.selected_variant_id &&
        normalizedVideoAnalysis.selected_variant_id !== selectedAnalysisVariantId
      ) {
        set({ selectedAnalysisVariantId: normalizedVideoAnalysis.selected_variant_id });
      }

      set({
        analysisDraft: prettifyJson(normalizedVideoAnalysis?.analysis ?? {}),
        analysisState: status === 200 ? "ready" : status === 202 ? "pending" : "error",
      });
    } catch (error) {
      console.error(error);
      set({ analysis: null, analysisDraft: "{}", analysisState: "error" });
    }

    await useTranscriptionStore.getState().fetchTranscription(selectedVideo);
  },

  onSaveAnalysis: async () => {
    const selectedVideo = useVideoDetailStore.getState().video;
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
      await useVideoDetailStore.getState().fetchVideoById(selectedVideo.id);
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "JSON inválido ou erro ao salvar a análise."));
    }
  },

  onDeleteAnalysis: async () => {
    const selectedVideo = useVideoDetailStore.getState().video;
    if (!selectedVideo) return;

    const { selectedAnalysisVariantId } = get();
    const { setMessage } = useUploadStore.getState();

    try {
      await VideoService.deleteAnalysis(selectedVideo.id, selectedAnalysisVariantId);
      set({
        analysis: null,
        selectedAnalysisVariantId: null,
        analysisDraft: "{}",
        analysisState: "error",
      });
      setMessage(selectedAnalysisVariantId ? "Versão da análise excluída." : "Análise excluída.");
      await useVideoDetailStore.getState().fetchVideoById(selectedVideo.id);
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Não foi possível excluir a análise."));
    }
  },

  onDeleteVideo: async () => {
    const selectedVideo = useVideoDetailStore.getState().video;
    if (!selectedVideo) return;

    const { setMessage, setHint } = useUploadStore.getState();

    try {
      await VideoService.deleteVideo(selectedVideo.id);
      setMessage("Vídeo removido com sucesso.");
      setHint("O arquivo enviado e os artefatos associados foram removidos.");

      set({ analysis: null, analysisDraft: "{}" });
      useTranscriptionStore.getState().resetTranscription();
      useTranscriptionStore.setState({ transcriptionMessage: "Transcrição removida." });

      get().resetArtifactSignature();
      useVideoDetailStore.getState().reset();
      
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Não foi possível excluir o vídeo."));
    }
  },

  resetArtifactSignature: () => {
    lastArtifactSignature = "";
  },
}));