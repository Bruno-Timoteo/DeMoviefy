// src/pages/Dashboard/components/VideoDashboard.tsx

import { useEffect, useRef } from "react";
import { useProcessingStore } from "src/core/stores/useProcessingStore";
import { useCatalogStore } from "src/core/stores/useAICatalogStore";
import { DashboardSidebar } from "src/pages/Dashboard/components/DashboardSidebar";
import { DashboardProgressBar } from "src/pages/Dashboard/components/DashboardProgressBar";
import { StatsPanel } from "src/pages/Dashboard/components/StatsPanel";
import { NewVideoPanel } from "src/pages/Dashboard/components/NewVideoPanel";
import { ProcessingQueuePanel } from "src/pages/Dashboard/components/ProcessingQueuePanel";

export default function VideoDashboard() {
    const initializedRef = useRef(false);

    const fetchCatalog = useCatalogStore((state) => state.fetchCatalog);
    const refresh = useProcessingStore((state) => state.refresh);
    const stats = useProcessingStore((state) => state.stats);

    useEffect(() => {
        if (initializedRef.current) {
            return;
        }
        initializedRef.current = true;
        void Promise.all([fetchCatalog(), refresh()]);
    }, [fetchCatalog, refresh]);

    return (
        <div className="relative flex min-h-[calc(100vh-6rem)] w-full">
            <DashboardSidebar
            />

            <div className="flex min-w-0 flex-1 flex-col">

                <DashboardProgressBar />

                <div className="flex flex-1 flex-col gap-10 pt-6">
                    <StatsPanel
                        total={stats.total}
                        processing={stats.processing}
                        processed={stats.processed}
                        errors={stats.errors}
                    />

                    <div className="grid gap-10 xl:grid-cols-2">
                        <NewVideoPanel />
                        <ProcessingQueuePanel />
                    </div>
                </div>
            </div>
        </div>
    );
}