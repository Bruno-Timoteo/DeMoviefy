// src/core/stores/useVideoStore.ts — versão atualizada

import { create } from "zustand";
import { VideoService } from "src/pages/Upload/services/videoService";
import type { VideoRecord } from "src/pages/Upload/types";

interface VideoStats {
  total: number;
  processing: number;
  processed: number;
  errors: number;
}

interface VideoState {
  videos: VideoRecord[];
  loadingVideos: boolean;
  selectedVideoId: number | null;
  selectedVideo: VideoRecord | null;
  selectedVideoIsBusy: boolean;
  stats: VideoStats;
  hint: string;

  setHint: (hint: string) => void;
  setSelectedVideoId: (id: number | null) => void;
  fetchVideos: (options?: { preserveHint?: boolean; silent?: boolean }) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

// Calcula selectedVideo, selectedVideoIsBusy e stats a partir de uma lista de vídeos + id selecionado.
// Centralizado aqui para não duplicar a lógica em cada action que toca `videos`,
// nem em cada componente que precisaria recalcular `selectedVideoIsBusy` por conta própria.
function deriveFromVideos(videos: VideoRecord[], selectedVideoId: number | null) {
  const selectedVideo = videos.find((v) => v.id === selectedVideoId) ?? null;
  const selectedVideoIsBusy = selectedVideo?.status.startsWith("PROCESSANDO") ?? false;
  const stats: VideoStats = {
    total: videos.length,
    processing: videos.filter((v) => v.status.startsWith("PROCESSANDO")).length,
    processed: videos.filter((v) => v.status === "PROCESSADO").length,
    errors: videos.filter((v) => v.status.startsWith("ERRO")).length,
  };
  return { selectedVideo, selectedVideoIsBusy, stats };
}

let pollingTimer: number | null = null;

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  loadingVideos: false,
  selectedVideoId: null,
  selectedVideo: null,
  selectedVideoIsBusy: false,
  stats: { total: 0, processing: 0, processed: 0, errors: 0 },
  hint: "",

  setHint: (hint) => set({ hint }),

  setSelectedVideoId: (id) => {
    const { videos } = get();
    const { selectedVideo, selectedVideoIsBusy, stats } = deriveFromVideos(videos, id);
    set({ selectedVideoId: id, selectedVideo, selectedVideoIsBusy, stats });
  },

  fetchVideos: async (options) => {
    const preserveHint = options?.preserveHint ?? true;
    const silent = options?.silent ?? false;

    if (!silent) set({ loadingVideos: true });

    try {
      const normalizedVideos = await VideoService.listVideosNormalized();
      const { selectedVideoId: currentId } = get();

      const nextSelectedId =
        normalizedVideos.length === 0 || currentId === null
          ? null
          : normalizedVideos.some((v) => v.id === currentId)
          ? currentId
          : null;

      const { selectedVideo, selectedVideoIsBusy, stats } = deriveFromVideos(normalizedVideos, nextSelectedId);

      set({
        videos: normalizedVideos,
        selectedVideoId: nextSelectedId,
        selectedVideo,
        selectedVideoIsBusy,
        stats,
        ...(!preserveHint && { hint: `Biblioteca atualizada com ${normalizedVideos.length} video(s).` }),
      });

      const hasRunningAnalysis = normalizedVideos.some((v) => v.status.startsWith("PROCESSANDO"));
      if (hasRunningAnalysis) {
        get().startPolling();
      } else {
        get().stopPolling();
      }
    } catch (error) {
      console.error(error);
      set({ hint: "Não foi possível atualizar a biblioteca." });
    } finally {
      if (!silent) set({ loadingVideos: false });
    }
  },

  startPolling: () => {
    if (pollingTimer !== null) return;
    pollingTimer = window.setInterval(() => {
      void get().fetchVideos({ silent: true });
    }, 7000);
  },

  stopPolling: () => {
    if (pollingTimer === null) return;
    window.clearInterval(pollingTimer);
    pollingTimer = null;
  },
}));