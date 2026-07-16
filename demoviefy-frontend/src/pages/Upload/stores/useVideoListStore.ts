// src/pages/Upload/stores/useVideoListStore.ts

import { create } from "zustand";
import { toast } from "sonner";
import { createPoller } from "src/core/utils/createPoller";
import { VideoService } from "src/pages/Upload/services/videoService";
import type { VideoRecord } from "src/pages/Upload/types";
import { getApiErrorMessage, sleep } from "src/pages/Upload/utils/helpers";

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
  fetchVideos: () => Promise<void>;
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

const poller = createPoller(500); // No caso, irá atualizar a cada 0,5 segundos.

export const useVideoListStore = create<VideoState>((set, get) => ({
  videos: [],
  loadingVideos: false,
  stats: { total: 0, processing: 0, processed: 0, errors: 0 },


  fetchVideos: async () => {
    set({ loadingVideos: true });

    try {
      const normalizedVideos = await VideoService.listVideosNormalized();


      const { stats } = deriveFromVideos(normalizedVideos);

      set({
        videos: normalizedVideos,
        stats      
    });

      const hasRunningAnalysis = normalizedVideos.some((v) => v.status.startsWith("PROCESSANDO"));

        if (hasRunningAnalysis) {
            const started = poller.start(() => void get().fetchVideos());

            if (started) {
                toast("Processamento iniciado."); // Não funciona pois o poller começa já no upload.
            }

        } else {
            poller.stop();

        }
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Erro ao buscar vídeos."))
    } finally {
      set({ loadingVideos: false });
    }
  },
}));