export const DEFAULT_PROCESSING = {
  processing_progress: 0,
  processing_stage: "idle",
  processing_eta_seconds: null,
  processing_message: "Aguardando processamento.",
};

export const DEFAULT_AI_CONFIG = {
  task_type: "object_detection",
  task_label: "Deteccao de Objetos",
  model_path: "",
  model_relative_path: "",
  model_name: "Modelo nao informado",
  frame_stride: 8,
  confidence_threshold: 0.35,
  max_frames: 300,
  clip_start_sec: 0,
  clip_end_sec: null,
};
