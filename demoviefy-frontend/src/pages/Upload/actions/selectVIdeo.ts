// src/pages/Upload/actions/selectVideo.ts
import { useVideoStore } from "src/stores/useVideoStore";
import { useAnalysisStore } from "src/stores/useAnalysisStore";

export function selectVideo(id: number | null) {
  useVideoStore.getState().setSelectedVideoId(id);
  void useAnalysisStore.getState().syncAnalysisWithSelectedVideo();
}