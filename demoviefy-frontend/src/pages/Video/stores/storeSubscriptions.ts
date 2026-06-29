// src/pages/Video/stores/storeSubscriptions.ts

import { useVideoDetailStore } from "src/pages/Video/stores/useVideoDetailStore";
import { useAnalysisStore } from "src/pages/Video/stores/useAnalysisStore"

export function registerStoreSubscriptions() {
    useVideoDetailStore.subscribe((state, prevState) => {
        if (state.video?.id !== prevState.video?.id) {
            useAnalysisStore.setState({ selectedAnalysisVariantId: null });
            void useAnalysisStore.getState().syncAnalysisWithSelectedVideo();
        }
    });
}