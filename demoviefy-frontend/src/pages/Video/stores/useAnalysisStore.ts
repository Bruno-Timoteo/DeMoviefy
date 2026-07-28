// src/pages/Video/stores/useAnalysisStore.ts

import { create } from "zustand";
import { VideoService } from "src/pages/Upload/services/videoService";
import { prettifyJson, getApiErrorMessage, buildArtifactSignature } from "src/pages/Upload/utils/helpers";
import { toast } from "sonner";
import { useVideoDetailStore } from "src/pages/Video/stores/useVideoDetailStore";
import { useTranscriptionStore } from "src/pages/Video/stores/useTranscriptionStore";
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
  onDeleteVideo: () => Promise<boolean>;

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
      toast.success("Análise salva com sucesso.");
      await useVideoDetailStore.getState().fetchVideoById(selectedVideo.id, {force: true});
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "JSON inválido ou erro ao salvar a análise."));
    }
  },

  onDeleteAnalysis: async () => {
    const selectedVideo = useVideoDetailStore.getState().video;
    if (!selectedVideo) return;

    const { selectedAnalysisVariantId } = get();

    try {
      await VideoService.deleteAnalysis(selectedVideo.id, selectedAnalysisVariantId);
      set({
        analysis: null,
        selectedAnalysisVariantId: null,
        analysisDraft: "{}",
        analysisState: "error",
      });
      toast.success("Versão da análise excluída.");
      await useVideoDetailStore.getState().fetchVideoById(selectedVideo.id, { force: true });

        const sync = get().syncAnalysisWithSelectedVideo;
        void sync();

    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Não foi possível excluir a análise."));
    }
  },

  onDeleteVideo: async () => {
    const selectedVideo = useVideoDetailStore.getState().video;
    if (!selectedVideo) return false;

    try {
      await VideoService.deleteVideo(selectedVideo.id);
      toast.success("Vídeo removido com sucesso.");

      set({ analysis: null, analysisDraft: "{}" });
      useTranscriptionStore.getState().resetTranscription();
      useTranscriptionStore.setState({ transcriptionMessage: "Transcrição removida." });

      get().resetArtifactSignature();
      useVideoDetailStore.getState().reset();
      return true;
      
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Não foi possível excluir o vídeo."));
      return false;
    }
  },

  resetArtifactSignature: () => {
    lastArtifactSignature = "";
  },
}));