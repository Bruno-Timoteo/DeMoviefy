// src/pages/Video/stores/useVideoDetailStore.ts

import { create } from "zustand";
import { VideoService } from "src/core/services/videoService";
import { normalizeVideoRecord } from "src/core/utils/videoNormalizers";
import type { VideoRecord } from "src/core/types/videoTypes";

interface VideoDetailState {
  video: VideoRecord | null;
  loading: boolean;
  error: string | null;
  fetchVideoById: (id: number) => Promise<void>;
  reset: () => void;
}


export const useVideoDetailStore = create<VideoDetailState>((set) => ({
  video: null, // Ou seja, enquanto o vídeo não terminar de carregar será null. Para verificar se houve
               // erro no fetch, deve ser olhado se error != null
  loading: false,
  error: null,

  fetchVideoById: async (id) => {

    set({ loading: true, error: null });
    try {
      const data = await VideoService.getVideoById(id);
      set({ video: normalizeVideoRecord(data), loading: false });


    } catch (error) {
      console.error(error);
      set({ video: null, loading: false, error: "Não foi possível carregar este vídeo." });
    }
  },

  reset: () => set({ video: null, loading: false, error: null }),
}));