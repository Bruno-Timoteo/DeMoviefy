// src/pages/Video/stores/useVideoDetailStore.ts

import { create } from "zustand";
import { createPoller } from "src/core/utils/createPoller";
import { VideoService } from "src/pages/Upload/services/videoService";
import { normalizeVideoRecord } from "src/pages/Upload/utils/normalizers";
import type { VideoRecord } from "src/pages/Upload/types";

interface VideoDetailState {
  video: VideoRecord | null;
  loading: boolean;
  error: string | null;
  fetchVideoById: (id: number, options?: { force?: boolean}) => Promise<void>;
  reset: () => void;
  stopPolling: () => void;
}

const poller = createPoller(500); // No caso, irá atualizar a cada 0,5 segundos.

export const useVideoDetailStore = create<VideoDetailState>((set, get) => ({
  video: null, // Ou seja, enquanto o vídeo não terminar de carregar será null. Para verificar se houve
               // erro no fetch, deve ser olhado se error != null
  loading: false,
  error: null,

  fetchVideoById: async (id, options) => {
    const force = options?.force ?? false;
    const current = get().video;
    if (!force && current?.id === id && !get().loading) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const data = await VideoService.getVideoById(id);
      set({ video: normalizeVideoRecord(data), loading: false });
        
        // aqui — decide se o polling deve continuar ou parar, a cada fetch
        if (data.status.startsWith("PROCESSANDO")) {
            poller.start(() => void get().fetchVideoById(id, { force: true }));
        } else {
            poller.stop();
        }

    } catch (error) {
      console.error(error);
      set({ video: null, loading: false, error: "Não foi possível carregar este vídeo." });
    }
  },

  reset: () => set({ video: null, loading: false, error: null }),
  stopPolling: () => poller.stop(),
}));