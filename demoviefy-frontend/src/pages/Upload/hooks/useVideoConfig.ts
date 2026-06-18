// src/pages/Upload/hooks/useVideoConfig.ts
import { useCallback, useEffect, useState } from "react";
import { VideoService } from "../services/videoService";
import type { AiConfigPayload, VideoRecord } from "../types";
import { getApiErrorMessage, chooseFirstModel } from "../utils/helpers";

// Importando as stores globais
import { useUploadStore } from "../../../store/useUploadStore";
import { useCatalogStore } from "../../../store/useCatalogStore";

export function useVideoConfig(
  selectedVideo: VideoRecord | null,
  fetchVideos: () => Promise<void>
) {
  const [videoConfig, setVideoConfig] = useState<AiConfigPayload>({
    task_type: "object_detection",
    model_path: "",
    frame_stride: "8",
    confidence_threshold: "0.35",
    max_frames: "300",
    clip_start_sec: "0",
    clip_end_sec: null,
  });

  // Sincroniza estados com o vídeo selecionado
  useEffect(() => {
    if (!selectedVideo) return;

    setVideoConfig({
      task_type: selectedVideo.ai_config.task_type,
      model_path: selectedVideo.ai_config.model_relative_path,
      frame_stride: String(selectedVideo.ai_config.frame_stride ?? 8),
      confidence_threshold: String(selectedVideo.ai_config.confidence_threshold ?? 0.35),
      max_frames: String(selectedVideo.ai_config.max_frames ?? 300),
      clip_start_sec: String(selectedVideo.ai_config.clip_start_sec ?? 0),
      clip_end_sec: selectedVideo.ai_config.clip_end_sec === null
        ? null
        : String(selectedVideo.ai_config.clip_end_sec),
    });
  }, [selectedVideo]);

  // Pega os models direto da store para a lógica de auto-seleção
  const handleVideoTaskChange = useCallback((taskType: string) => {
    const models = useCatalogStore.getState().models;
    setVideoConfig((prev) => ({
      ...prev,
      task_type: taskType,
      model_path: chooseFirstModel(models, taskType),
    }));
  }, []);

  const handleSaveConfig = useCallback(async () => {
    if (!selectedVideo) return;
    const setMessage = useUploadStore.getState().setMessage;

    try {
      await VideoService.saveAiConfig(selectedVideo.id, videoConfig);
      setMessage("Configuração de IA salva para o vídeo selecionado.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Não foi possível salvar a configuração de IA."));
    }
  }, [selectedVideo, videoConfig, fetchVideos]);

  const handleReprocess = useCallback(async () => {
    if (!selectedVideo) return;
    const { setMessage, setHint } = useUploadStore.getState();

    try {
      await VideoService.reprocessVideo(selectedVideo.id, videoConfig);
      setMessage("Reprocessamento iniciado.");
      setHint("O vídeo será analisado novamente com a configuração escolhida.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Não foi possível iniciar o reprocessamento."));
    }
  }, [selectedVideo, videoConfig, fetchVideos]);

  return {
    videoConfig,
    setVideoConfig,
    handleVideoTaskChange,
    handleSaveConfig,
    handleReprocess,
  };
}