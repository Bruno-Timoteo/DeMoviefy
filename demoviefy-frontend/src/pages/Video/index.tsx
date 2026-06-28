// src/pages/Video/index.tsx
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { selectVideo } from "src/pages/Video/actions/selectVideo";
import { useVideoStore } from "src/core/stores/useVideoStore";
import { useVideoConfig } from "src/pages/Video/hooks/useVideoConfig";
import { VideoWorkbench } from "src/pages/Video/components/VideoWorkbench";

export default function Video() {
  const { id } = useParams<{ id: string }>();
  const parsedId = id ? Number(id) : NaN;
  const isValidId = !Number.isNaN(parsedId);

  useEffect(() => {
    selectVideo(isValidId ? parsedId : null);
  }, [parsedId, isValidId]);

  const {
    videoConfig,
    setVideoConfig,
    handleSaveConfig,
    handleReprocess,
  } = useVideoConfig();

    const selectedVideoIsBusy = useVideoStore((state) => state.selectedVideoIsBusy);



  if (!isValidId) {
    return <p>ID de vídeo inválido.</p>;
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