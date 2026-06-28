// src/pages/Video/index.tsx
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useVideoDetailStore } from "src/pages/Video/stores/useVideoDetailStore";
import { useVideoConfig } from "src/pages/Video/hooks/useVideoConfig";
import { useCatalogStore } from "src/core/stores/useCatalogStore";
import { VideoWorkbench } from "src/pages/Video/components/VideoWorkbench";

export default function Video() {
    const { id } = useParams<{ id: string }>();
    const parsedId = id ? Number(id) : NaN;
    const isValidId = !Number.isNaN(parsedId);

    useEffect(() => {
        if (isValidId) {
            void useVideoDetailStore.getState().fetchVideoById(parsedId);
        }
          if (useCatalogStore.getState().tasks.length === 0) {
            void useCatalogStore.getState().fetchCatalog();
        }
    }, [parsedId, isValidId]);

    const {
        videoConfig,
        setVideoConfig,
        handleSaveConfig,
        handleReprocess,
    } = useVideoConfig();

    const video = useVideoDetailStore((state) => state.video);
    const selectedVideoIsBusy = video?.status.startsWith("PROCESSANDO") ?? false;

    const loading = useVideoDetailStore((state) => state.loading);
    const error = useVideoDetailStore((state) => state.error);

    if (!isValidId) {
        return <p>ID de vídeo inválido.</p>;
    }

    if (loading) {
        return <p>Carregando vídeo...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }
    return (
        <VideoWorkbench
            config={videoConfig}
            isBusy={selectedVideoIsBusy}
            onConfigChange={setVideoConfig}
            onSaveConfig={handleSaveConfig}
            onReprocess={handleReprocess}
        />
    );
}