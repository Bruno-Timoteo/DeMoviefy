// src/core/stores/storeSubscriptions.ts

import { useVideoStore } from "src/core/stores/useVideoStore";
import { useAnalysisStore } from "src/pages/Video/stores/useAnalysisStore"

export function registerStoreSubscriptions() {
  useVideoStore.subscribe((state, prevState) => {
    if (state.selectedVideoId !== prevState.selectedVideoId) {
      void useAnalysisStore.getState().syncAnalysisWithSelectedVideo();
    }
  });
}