// src/pages/Upload/components/VideoDashboard.tsx
import { useCallback, useEffect, useRef, useState } from "react";

import { useCompatibility } from "src/pages/Upload/hooks/useCompatibility";
import { useVideoConfig } from "src/pages/Upload/hooks/useVideoConfig";
import { useVideoStore } from "src/stores/useVideoStore";
import { useCatalogStore } from "src/stores/useCatalogStore";
import { selectVideo } from "src/pages/Upload/actions/selectVideo";
import { CompatibilityBanner } from "src/pages/Upload/components/CompatibilityBanner";
import { DashboardSidebar } from "src/pages/Upload/components/DashboardSidebar";
import { DashboardHeader } from "src/pages/Upload/components/DashboardHeader";
import { DashboardProgressBar } from "src/pages/Upload/components/DashboardProgressBar";

import { StatsPanel } from "src/pages/Upload/components/StatsPanel";
import { NewVideoPanel } from "src/pages/Upload/components/NewVideoPanel";
import { VideoWorkbench } from "src/pages/Upload/components/VideoWorkbench";
import { ProcessingQueuePanel } from "src/pages/Upload/components/ProcessingQueuePanel";

import "/src/pages/Upload/styles/VideoDashboard.css";
import "/src/pages/Upload/styles/NewVideoPanel.css";
import "/src/pages/Upload/styles/ProcessingQueuePanel.css";
import "/src/pages/Upload/styles/NewDashboardLayout.css";

export default function VideoDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const initializedRef = useRef(false);

    const { compatibility, checkBackendCompatibility } = useCompatibility();
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
        const bootstrap = async () => {
            const compatible = await checkBackendCompatibility();
            if (!compatible) {
                return;
            }
            await Promise.all([fetchCatalog(), fetchVideos({ preserveHint: false })]);
        };
        void bootstrap();
    }, [checkBackendCompatibility, fetchCatalog, fetchVideos]);

    const handleRetryCompatibility = useCallback(async () => {
        const compatible = await checkBackendCompatibility();
        if (!compatible) {
            return;
        }
        await Promise.all([fetchCatalog(), fetchVideos({ preserveHint: false })]);
    }, [checkBackendCompatibility, fetchCatalog, fetchVideos]);

    if (compatibility.status !== "compatible") {
        return (
            <CompatibilityBanner
                status={compatibility.status}
                message={compatibility.message}
                backendInfo={compatibility.backendInfo}
                onRetry={() => void handleRetryCompatibility()}
            />
        );
    }

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
                                <NewVideoPanel
                                    onRefresh={() => void fetchVideos({ preserveHint: false })}
                                />

                                <ProcessingQueuePanel />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}