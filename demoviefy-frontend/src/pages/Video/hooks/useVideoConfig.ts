// src/pages/Dashboard/Video/useVideoConfig.ts
import { useCallback, useEffect, useState } from "react";
import { useProcessingStore } from "src/core/stores/useProcessingStore";
import { VideoService } from "src/core/services/videoService";
import { toast } from "sonner";
import type { AiConfigPayload, VideoRecord } from "src/core/types/videoTypes";
import { getApiErrorMessage, chooseFirstModel } from "src/core/utils/videoHelpers";
import { useCatalogStore } from "src/core/stores/useAICatalogStore";

export function useVideoConfig(video: VideoRecord | null) {


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
        if (!video) return;
        setVideoConfig({
            task_type: video.ai_config.task_type,
            model_path: video.ai_config.model_relative_path,
            frame_stride: String(video.ai_config.frame_stride ?? 8),
            confidence_threshold: String(video.ai_config.confidence_threshold ?? 0.35),
            max_frames: String(video.ai_config.max_frames ?? 300),
            clip_start_sec: String(video.ai_config.clip_start_sec ?? 0),
            clip_end_sec: video.ai_config.clip_end_sec === null
                ? null
                : String(video.ai_config.clip_end_sec),
        });
    }, [video]);

    const handleVideoTaskChange = useCallback((taskType: string) => {
        const models = useCatalogStore.getState().models;
        setVideoConfig((prev) => ({
            ...prev,
            task_type: taskType,
            model_path: chooseFirstModel(models, taskType),
        }));
    }, []);

    const handleSaveConfig = useCallback(async () => {
        if (!video) return;

        try {
            await VideoService.saveAiConfig(video.id, videoConfig);
            toast.success("Configuração de IA salva para o vídeo selecionado.");
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, "Não foi possível salvar a configuração de IA."));
        }
    }, [videoConfig]);

    const handleReprocess = useCallback(async () => {
        if (!video) return;

        try {
            await VideoService.reprocessVideo(video.id, videoConfig);
            await useProcessingStore.getState().refresh();
            
            toast("Reprocessamento iniciado.");
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, "Não foi possível iniciar o reprocessamento."));
        }
    }, [videoConfig]);

    return {
        videoConfig,
        setVideoConfig,
        handleVideoTaskChange,
        handleSaveConfig,
        handleReprocess,
    };
}