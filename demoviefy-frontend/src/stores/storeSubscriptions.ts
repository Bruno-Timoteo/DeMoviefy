// src/stores/storeSubscriptions.ts

import { useVideoStore } from "src/stores/useVideoStore";
import { useAnalysisStore } from "src/stores/useAnalysisStore";

export function registerStoreSubscriptions() {
  useVideoStore.subscribe((state, prevState) => {
    if (state.selectedVideoId !== prevState.selectedVideoId) {
      void useAnalysisStore.getState().syncAnalysisWithSelectedVideo();
    }
  });
}