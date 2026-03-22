export type VideoStorage = {
  video_relative_path: string;
  video_absolute_path: string;
  video_exists: boolean;
  analysis_relative_path: string;
  analysis_absolute_path: string;
  analysis_exists: boolean;
  transcription_relative_path: string;
  transcription_absolute_path: string;
  transcription_exists: boolean;
};

export type AIModelOption = {
  id: string;
  name: string;
  task_type: string;
  task_label: string;
  relative_path: string;
  absolute_path: string;
};

export type AITaskOption = {
  task_type: string;
  task_label: string;
};

export type AIConfig = {
  task_type: string;
  task_label: string;
  model_path: string;
  model_relative_path: string;
  model_name: string;
};

export type VideoRecord = {
  id: number;
  filename: string;
  status: string;
  created_at: string | null;
  analysis_ready: boolean;
  transcription_ready: boolean;
  video_url: string;
  analysis_url: string;
  transcription_url: string;
  ai_config: AIConfig;
  storage: VideoStorage;
};

export type VideoAnalysisSummary = {
  video_path: string;
  model_path: string;
  task_type: string;
  frame_stride: number;
  confidence_threshold: number;
  max_frames: number;
  sampled_frames: number;
  processed_frames: number;
  total_detections: number;
  label_counts: Record<string, number>;
  avg_confidence_by_label: Record<string, number>;
  top_labels: string[];
};

export type VideoAnalysisResponse = {
  video_id: number;
  filename: string;
  status: string;
  ai_config: AIConfig;
  storage: VideoStorage;
  analysis: VideoAnalysisSummary;
};

export type VideoTranscriptionResponse = {
  video_id: number;
  filename: string;
  storage: VideoStorage;
  transcription: {
    content: string;
    source: string;
    language: string | null;
  };
};

export type ModelCatalogResponse = {
  models: AIModelOption[];
  tasks: AITaskOption[];
};

export type UploadResponse = {
  message: string;
  video: VideoRecord;
  next_steps: {
    video_saved_in: string;
    analysis_will_be_saved_in: string;
    transcription_will_be_saved_in: string;
    analysis_status: string;
  };
};
