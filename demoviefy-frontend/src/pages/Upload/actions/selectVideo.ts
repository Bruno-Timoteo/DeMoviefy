// src/pages/Upload/actions/selectVideo.ts
import { useVideoStore } from "src/stores/useVideoStore";

export function selectVideo(id: number | null) {
  useVideoStore.getState().setSelectedVideoId(id);
}