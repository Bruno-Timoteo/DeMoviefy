// src/pages/Video/stores/storeSubscriptions.ts

import { useVideoDetailStore } from "src/pages/Video/stores/useVideoDetailStore";
import { useAnalysisStore } from "src/pages/Video/stores/useAnalysisStore"

export function registerStoreSubscriptions() {
    useVideoDetailStore.subscribe((state, prevState) => {
        const idChanged = state.video?.id !== prevState.video?.id;
        const finishedProcessing =
            prevState.video?.status.startsWith("PROCESSANDO") &&
            state.video?.status === "PROCESSADO";

        if (idChanged || finishedProcessing) {
            useAnalysisStore.setState({ selectedAnalysisVariantId: null });
            useAnalysisStore.getState().resetArtifactSignature();
            void useAnalysisStore.getState().syncAnalysisWithSelectedVideo();
        }
    });
}