// src/pages/Dashboard/components/ProcessingQueuePanel.tsx

import { useState } from "react";

import { toast } from "sonner";

import { StatusBadge } from "src/core/components/StatusBadge";
import { getApiErrorMessage } from "src/core/utils/videoHelpers";
import { useProcessingStore } from "src/core/stores/useProcessingStore";
import { VideoUploadService } from "src/pages/Dashboard/services/videoUploadService";

export function ProcessingQueuePanel() {
  const videos = useProcessingStore((state) => state.videos);

  const [cancellingVideoId, setCancellingVideoId] = useState<number | null>(
    null
  );

  const processingVideos = videos.filter(
    (v) => v.status === "PROCESSANDO" || v.status === "PROCESSANDO_IA"
  );

  async function cancelProcessing(videoId: number) {
    setCancellingVideoId(videoId);

    try {
      await VideoUploadService.cancelProcessing(videoId);

      toast.success("Processamento cancelado. O vídeo foi mantido.");

      await useProcessingStore.getState().refresh();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          "Não foi possível cancelar o processamento."
        )
      );
    } finally {
      setCancellingVideoId(null);
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Fila de processamento
          </h2>
        </div>

        <p className="mt-2 text-base leading-7 text-neutral-500">
          Acompanhe os vídeos que estão sendo processados.
        </p>
      </div>

      {processingVideos.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center border border-blue-100 bg-blue-50 px-8 py-10 text-center">
          <p className="text-base font-medium text-neutral-900">
            Nenhum vídeo em processamento
          </p>

          <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
            Assim que um vídeo começar a ser processado, ele aparecerá aqui
            para você acompanhar o progresso.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {processingVideos.map((video) => (
            <div
              key={video.id}
              className="border border-neutral-200 bg-neutral-50 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div
                    className="truncate text-sm font-medium text-neutral-900"
                    title={video.filename}
                  >
                    {video.filename}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                    <span>{video.ai_config.task_label}</span>
                    <span>{video.ai_config.model_name}</span>
                  </div>
                </div>

                <StatusBadge status={video.status} />
              </div>

              <div className="mt-5">
                <div className="h-1.5 w-full bg-neutral-200">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{
                      width: `${video.processing.processing_progress}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-start justify-between gap-4 text-xs text-neutral-500">
                  <span className="min-w-0 truncate">
                    {video.processing.processing_message}
                  </span>

                  <span className="shrink-0">
                    {video.processing.processing_progress}%
                    {video.processing.processing_eta_seconds !== null &&
                      ` · ~${video.processing.processing_eta_seconds}s`}
                  </span>
                </div>

                <button
                  type="button"
                  className="mt-4 cursor-pointer bg-red-100 px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
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
      )}
    </section>
  );
}