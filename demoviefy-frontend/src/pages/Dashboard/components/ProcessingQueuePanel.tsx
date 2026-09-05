// src/pages/Dashboard/components/ProcessingQueuePanel.tsx

import { useState } from "react";
import { toast } from "sonner";
import { useProcessingStore } from "src/core/stores/useProcessingStore";
import { VideoService } from "src/core/services/videoService";
import { getApiErrorMessage } from "src/core/utils/videoHelpers";

export function ProcessingQueuePanel() {
  const videos = useProcessingStore((state) => state.videos);

  const [cancellingVideoId, setCancellingVideoId] = useState<number | null>(null);

  const processingVideos = videos.filter(
    (v) => v.status === "PROCESSANDO" || v.status === "PROCESSANDO_IA"
  );

  if (processingVideos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-semibold">
            Fila de processamento
          </h2>
        </div>

        <div className="py-8 text-center">
          <p className="text-sm text-slate-400">
            Nenhum vídeo em processamento
          </p>
        </div>
      </div>
    );
  }

  async function cancelProcessing(videoId: number) {
    setCancellingVideoId(videoId);
    try {
      await VideoService.cancelProcessing(videoId);
      toast.success("Processamento cancelado. O vídeo foi mantido.");
      await useProcessingStore.getState().refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível cancelar o processamento."));
    } finally {
      setCancellingVideoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-semibold">
          Fila de processamento
        </h2>

        {processingVideos.length > 0 && (
          <span className="text-sm text-slate-400">
            {processingVideos.length} em andamento
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {processingVideos.map((video) => (
          <div
            key={video.id}
            className="border-b border-slate-800 py-5 last:border-b-0"
          >
            {/* Video Info */}
            <div>
              <div className="truncate text-sm font-medium" title={video.filename}>
                {video.filename}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                <span>{video.ai_config.task_label}</span>
                <span>{video.ai_config.model_name}</span>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="h-1 w-full bg-slate-800">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{
                    width: `${video.processing.processing_progress}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>{video.processing.processing_message}</span>

                <span>
                  {video.processing.processing_progress}%
                  {video.processing.processing_eta_seconds !== null &&
                    ` · ~${video.processing.processing_eta_seconds}s`}
                </span>
              </div>

              {/* Stage Indicator */}
              <div className="progress-stage">
                {video.processing.processing_message}
              </div>
              <button
                type="button"
                className="mt-3 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                disabled={cancellingVideoId === video.id}
                onClick={() => void cancelProcessing(video.id)}
              >
                {cancellingVideoId === video.id
                  ? "Cancelando..."
                  : "Cancelar processamento"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
