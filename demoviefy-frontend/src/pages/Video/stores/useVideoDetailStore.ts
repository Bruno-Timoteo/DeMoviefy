// src/core/stores/useVideoDetailStore.ts

import { create } from "zustand";
import { VideoService } from "src/pages/Upload/services/videoService";
import { normalizeVideoRecord } from "src/pages/Upload/utils/normalizers";
import type { VideoRecord } from "src/pages/Upload/types";

interface VideoDetailState {
  video: VideoRecord | null;
  loading: boolean;
  error: string | null;
  fetchVideoById: (id: number) => Promise<void>;
  reset: () => void;
}

export const useVideoDetailStore = create<VideoDetailState>((set, get) => ({
  video: null, // Ou seja, enquanto o vídeo não terminar de carregar será null. Para verificar se houve
               // erro no fetch, deve ser olhado se error != null
  loading: false,
  error: null,

  fetchVideoById: async (id) => {
    // Evita refetch se já estamos olhando para o mesmo vídeo e ele já carregou.
    // Sem essa guarda, qualquer chamador que dispare fetchVideoById de novo
    // (ex: um futuro polling) recriaria a busca do zero a cada chamada.
    const current = get().video;
    if (current?.id === id && !get().loading) {
      return;
    }

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