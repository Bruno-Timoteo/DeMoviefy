import { useProcessingStore } from "src/core/stores/useProcessingStore";
import { VideoLibrary } from "src/pages/Dashboard/components/VideoLibrary";

export function DashboardSidebar() {
  const videos = useProcessingStore((state) => state.videos);

  return (
    <aside className="h-full w-72 shrink-0 border-r border-neutral-200 bg-white">
      <div className="px-6 py-6">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
          Biblioteca
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Vídeos analisados
        </p>
      </div>

      <VideoLibrary videos={videos}/>
    </aside>
  );
}