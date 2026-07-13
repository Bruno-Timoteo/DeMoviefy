// VideoDashboard.tsx, versão ajustada
import { useEffect, useRef, useState } from "react";
import { useVideoListStore } from "src/pages/Upload/stores/useVideoListStore";
import { useCatalogStore } from "src/core/stores/useAICatalogStore";
import { DashboardSidebar } from "src/pages/Upload/components/DashboardSidebar";
import { DashboardHeader } from "src/pages/Upload/components/DashboardHeader";
import { DashboardProgressBar } from "src/pages/Upload/components/DashboardProgressBar";
import { StatsPanel } from "src/pages/Upload/components/StatsPanel";
import { NewVideoPanel } from "src/pages/Upload/components/NewVideoPanel";
import { ProcessingQueuePanel } from "src/pages/Upload/components/ProcessingQueuePanel";
import "/src/pages/Upload/styles/VideoDashboard.css";
import "/src/pages/Upload/styles/NewVideoPanel.css";
import "/src/pages/Upload/styles/ProcessingQueuePanel.css";
import "/src/pages/Upload/styles/NewDashboardLayout.css";

export default function VideoDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const initializedRef = useRef(false);

    const fetchCatalog = useCatalogStore((state) => state.fetchCatalog);
    const fetchVideos = useVideoListStore((state) => state.fetchVideos);
    const stats = useVideoListStore((state) => state.stats);

    useEffect(() => {
        if (initializedRef.current) {
            return;
        }
        initializedRef.current = true;
        void Promise.all([fetchCatalog(), fetchVideos()]);
    }, [fetchCatalog, fetchVideos]);

    return (
        <div className="dashboard-container">
            <DashboardSidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="dashboard-main">
                <DashboardHeader
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                />

                <DashboardProgressBar />

                <div className="dashboard-content">
                    <StatsPanel
                        total={stats.total}
                        processing={stats.processing}
                        processed={stats.processed}
                        errors={stats.errors}
                    />
                    <div className="upload-section">
                        <NewVideoPanel onRefresh={() => void fetchVideos()} />
                        <ProcessingQueuePanel />
                    </div>
                </div>
            </div>
        </div>
    );
}