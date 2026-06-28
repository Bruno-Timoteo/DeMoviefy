// src/pages/Video/actions/selectVideo.ts
import { useVideoStore } from "src/core/stores/useVideoStore";

export function selectVideo(id: number | null) {
  useVideoStore.getState().setSelectedVideoId(id);
}