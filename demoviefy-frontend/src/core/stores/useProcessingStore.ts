// src/core/stores/useProcessingStore.ts

import { create } from "zustand";
import { toast } from "sonner";
import { createPoller } from "src/core/utils/createPoller";
import { VideoService } from "src/core/services/videoService";
import { normalizeVideoRecord } from "src/core/utils/videoNormalizers";
import { getApiErrorMessage } from "src/core/utils/videoHelpers";
import type { VideoRecord } from "src/core/types/videoTypes";

interface VideoStats {
    total: number;
    processing: number;
    processed: number;
    errors: number;
}

interface ProcessingState {
    videos: VideoRecord[];
    stats: VideoStats;
    loading: boolean;
    initialized: boolean;

    refresh: () => Promise<void>;
    startPolling: () => void;
    stopPolling: () => void;
}

function deriveStats(videos: VideoRecord[]): VideoStats {
    return {
        total: videos.length,

        processing: videos.filter((video) => video.status.startsWith("PROCESSANDO")).length,

        processed: videos.filter((video) => video.status === "PROCESSADO").length,

        errors: videos.filter((video) => video.status.startsWith("ERRO")).length,
    };
}

const poller = createPoller(500);

export const useProcessingStore = create<ProcessingState>((set, get) => ({
    videos: [],

    stats: {
        total: 0,
        processing: 0,
        processed: 0,
        errors: 0,
    },

    loading: false,
    initialized: false,

    refresh: async () => {
        if (get().loading) {
            return;
        }

        set({ loading: true });

        try {
            const videos = (await VideoService.listVideos()).map(normalizeVideoRecord);

            const previousStats = get().stats;
            const wasInitialized = get().initialized;

            const stats = deriveStats(videos);

            set({videos, stats, initialized: true,});

            if (wasInitialized) {

                if (stats.processed > previousStats.processed) {
                    toast.success("Processamento concluído");
                }

                else if (stats.errors > previousStats.errors) {
                    toast.error("Erro no processamento");
                }
            }

            const hasRunningProcessing = videos.some(
                (video) => video.status.startsWith("PROCESSANDO")
            );

            if (hasRunningProcessing) {
                get().startPolling();
            } else {
                get().stopPolling();
            }

        } catch (error) {
            console.error(error);

            toast.error(getApiErrorMessage(error, "Erro ao buscar vídeos."));

        } finally {
            set({ loading: false });
        }
    },

    startPolling: () => {
        poller.start(() => {
            void get().refresh();
        });
    },

    stopPolling: () => {
        poller.stop();
    },
}));
