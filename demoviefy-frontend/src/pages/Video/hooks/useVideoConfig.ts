// src/pages/Upload/Video/useVideoConfig.ts
import { useCallback, useEffect, useState } from "react";
import { toast } from "src/core/utils/toast";
import { VideoService } from "src/pages/Upload/services/videoService";
import type { AiConfigPayload } from "src/pages/Upload/types";
import { getApiErrorMessage, chooseFirstModel } from "src/pages/Upload/utils/helpers";
import { useCatalogStore } from "src/core/stores/useAICatalogStore";
import { useVideoDetailStore } from "src/pages/Video/stores/useVideoDetailStore";

export function useVideoConfig() {

    const selectedVideo = useVideoDetailStore((state) => state.video);

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

    const handleVideoTaskChange = useCallback((taskType: string) => {
        const models = useCatalogStore.getState().models;
        setVideoConfig((prev) => ({
            ...prev,
            task_type: taskType,
            model_path: chooseFirstModel(models, taskType),
        }));
    }, []);

    const handleSaveConfig = useCallback(async () => {
        const selectedVideo = useVideoDetailStore.getState().video;
        if (!selectedVideo) return;

        try {
            await VideoService.saveAiConfig(selectedVideo.id, videoConfig);
            toast.show("Configuração de IA salva para o vídeo selecionado.");
            await useVideoDetailStore.getState().fetchVideoById(selectedVideo.id, { force: true });
        } catch (error) {
            console.error(error);
            toast.show(getApiErrorMessage(error, "Não foi possível salvar a configuração de IA."));
        }
    }, [videoConfig]);

    const handleReprocess = useCallback(async () => {
        const selectedVideo = useVideoDetailStore.getState().video;
        if (!selectedVideo) return;

        try {
            await VideoService.reprocessVideo(selectedVideo.id, videoConfig);
            toast.show("Reprocessamento iniciado.");
            await useVideoDetailStore.getState().fetchVideoById(selectedVideo.id, { force: true });
        } catch (error) {
            console.error(error);
            toast.show(getApiErrorMessage(error, "Não foi possível iniciar o reprocessamento."));
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