// src/core/stores/useVideoStore.ts — versão atualizada

import { create } from "zustand";
import { createPoller } from "src/core/utils/createPoller";
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
  stats: VideoStats;
  hint: string;

  setHint: (hint: string) => void;
  fetchVideos: (options?: { preserveHint?: boolean; silent?: boolean }) => Promise<void>;
}

function deriveFromVideos(videos: VideoRecord[]) {
  const stats: VideoStats = {
    total: videos.length,
    processing: videos.filter((v) => v.status.startsWith("PROCESSANDO")).length,
    processed: videos.filter((v) => v.status === "PROCESSADO").length,
    errors: videos.filter((v) => v.status.startsWith("ERRO")).length,
  };
  return { stats };
}

const poller = createPoller(7000); // No caso, irá atualizar a cada 7 segundos.

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  loadingVideos: false,
  stats: { total: 0, processing: 0, processed: 0, errors: 0 },
  hint: "",

  setHint: (hint) => set({ hint }),

  fetchVideos: async (options) => {
    const preserveHint = options?.preserveHint ?? true;
    const silent = options?.silent ?? false;

    if (!silent) set({ loadingVideos: true });

    try {
      const normalizedVideos = await VideoService.listVideosNormalized();


      const { stats } = deriveFromVideos(normalizedVideos);

      set({
        videos: normalizedVideos,
        stats,
        ...(!preserveHint && { hint: `Biblioteca atualizada com ${normalizedVideos.length} video(s).` }),
      });

      const hasRunningAnalysis = normalizedVideos.some((v) => v.status.startsWith("PROCESSANDO"));
        if (hasRunningAnalysis) {
            poller.start(() => void get().fetchVideos({ silent: true }));
        } else {
            poller.stop();
        }
    } catch (error) {
      console.error(error);
      set({ hint: "Não foi possível atualizar a biblioteca." });
    } finally {
      if (!silent) set({ loadingVideos: false });
    }
  },
}));