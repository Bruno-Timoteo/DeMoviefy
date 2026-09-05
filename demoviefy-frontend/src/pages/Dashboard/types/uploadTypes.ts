// src/pages/Dashboard/uploadTypes.ts

import type { VideoRecord } from "src/core/types/videoTypes";

export type UploadResponse = {
  message: string;
  video: VideoRecord;
  next_steps: {
    video_saved_in: string;
    analysis_will_be_saved_in: string;
    annotated_will_be_saved_in: string;
    transcription_will_be_saved_in: string;
    analysis_status: string;
    runtime_settings?: {
      frame_stride: number;
      confidence_threshold: number;
      max_frames: number;
    };
  };
};