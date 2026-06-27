// src/pages/Upload/components/VideoDashboard.tsx
import { useEffect, useRef, useState } from "react";

import { useVideoConfig } from "src/pages/Video/hooks/useVideoConfig";
import { useVideoStore } from "src/core/stores/useVideoStore";
import { useCatalogStore } from "src/core/stores/useCatalogStore";
import { selectVideo } from "src/pages/Upload/actions/selectVideo";
import { DashboardSidebar } from "src/pages/Upload/components/DashboardSidebar";
import { DashboardHeader } from "src/pages/Upload/components/DashboardHeader";
import { DashboardProgressBar } from "src/pages/Upload/components/DashboardProgressBar";

import { StatsPanel } from "src/pages/Upload/components/StatsPanel";
import { NewVideoPanel } from "src/pages/Upload/components/NewVideoPanel";
import { VideoWorkbench } from "src/pages/Video/components/VideoWorkbench";
import { ProcessingQueuePanel } from "src/pages/Upload/components/ProcessingQueuePanel";

import "/src/pages/Upload/styles/VideoDashboard.css";
import "/src/pages/Upload/styles/NewVideoPanel.css";
import "/src/pages/Upload/styles/ProcessingQueuePanel.css";
import "/src/pages/Upload/styles/NewDashboardLayout.css";

export default function VideoDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const initializedRef = useRef(false);

    const selectedVideoIsBusy = useVideoStore((state) => state.selectedVideoIsBusy);

    const fetchCatalog = useCatalogStore((state) => state.fetchCatalog);
    const fetchVideos = useVideoStore((state) => state.fetchVideos);
    const selectedVideo = useVideoStore((state) => state.selectedVideo);
    const stats = useVideoStore((state) => state.stats);

    const {
        videoConfig,
        setVideoConfig,
        handleSaveConfig,
        handleReprocess,
    } = useVideoConfig();

    useEffect(() => {
        if (initializedRef.current) {
            return;
        }
        initializedRef.current = true;
        void Promise.all([fetchCatalog(), fetchVideos({ preserveHint: false })]);
    }, [fetchCatalog, fetchVideos]);

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <DashboardSidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Conteúdo principal */}
            <div className="dashboard-main">
                {/* Header */}
                <DashboardHeader
                    hasSelectedVideo={!!selectedVideo}
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    onNewUpload={() => selectVideo(null)}
                />

                {/* Progress Bar */}
                <DashboardProgressBar />

                {/* Content Area */}
                <div className="dashboard-content">
                    {selectedVideo ? (
                        <VideoWorkbench
                            config={videoConfig}
                            isBusy={selectedVideoIsBusy}
                            onConfigChange={setVideoConfig}
                            onSaveConfig={handleSaveConfig}
                            onReprocess={handleReprocess}
                        />
                    ) : (
                        <>
                            <StatsPanel
                                total={stats.total}
                                processing={stats.processing}
                                processed={stats.processed}
                                errors={stats.errors}
                            />

                            <div className="upload-section">
                                <NewVideoPanel onRefresh={() => void fetchVideos({ preserveHint: false })} />

                                <ProcessingQueuePanel />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}