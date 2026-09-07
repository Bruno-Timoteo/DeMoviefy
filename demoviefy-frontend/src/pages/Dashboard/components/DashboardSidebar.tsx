import { useProcessingStore } from "src/core/stores/useProcessingStore";

import { DashboardVideoLibrary } from "src/pages/Dashboard/components/DashboardVideoLibrary";

export function DashboardSidebar() {
  const videos = useProcessingStore((state) => state.videos);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="pb-4">
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">
          Biblioteca de vídeos
        </h2>

        <p className="mt-0.5 text-sm text-neutral-500">
          Vídeos analisados
        </p>
      </div>

      <DashboardVideoLibrary videos={videos} />
    </aside>
  );
}