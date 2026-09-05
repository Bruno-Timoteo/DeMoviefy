// src/pages/Video/hooks/useVideoWorkbenchSync.ts

// Hook responsável por limpar os itens de análise antigos e atualizar quando o
// usuário faz /video/1 -> /video/2, diretamente pela URL.

import { useEffect, useRef } from "react";

import { useAnalysisStore } from "src/pages/Video/stores/useAnalysisStore";
import type { VideoRecord } from "src/core/types/videoTypes";

export function useVideoWorkbenchSync(video: VideoRecord | null) {
    const previousVideoRef = useRef<VideoRecord | null>(null);

    useEffect(() => {
        if (!video) {
            previousVideoRef.current = null;
            return;
        }

        const previousVideo = previousVideoRef.current;

        const idChanged = previousVideo?.id !== video.id;

        const wasProcessing = previousVideo?.status.startsWith("PROCESSANDO") ?? false;

        const isProcessing = video.status.startsWith("PROCESSANDO");

        const startedProcessing = !wasProcessing && isProcessing;

        const finishedProcessing = wasProcessing && video.status === "PROCESSADO";

        if (idChanged || finishedProcessing) {
            useAnalysisStore.setState({selectedAnalysisVariantId: null,});
        }

        if (idChanged || startedProcessing || finishedProcessing) {
            useAnalysisStore.getState().resetArtifactSignature();
            void useAnalysisStore.getState().syncAnalysisWithSelectedVideo(video);
        }

        if (finishedProcessing){
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }

        previousVideoRef.current = video;
    }, [video]);
}