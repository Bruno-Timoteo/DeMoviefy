// src/pages/Upload/components/VideoDashboard.tsx
import { useCallback, useEffect, useRef, useState } from "react";

import { useCompatibility } from "src/pages/Upload/hooks/useCompatibility";
import { useVideos } from "src/pages/Upload/hooks/useVideos";
import { useAnalysis } from "src/pages/Upload/hooks/useAnalysis";
import { useTranscription } from "src/pages/Upload/hooks/useTranscription";
import { useVideoConfig } from "src/pages/Upload/hooks/useVideoConfig";
import { useUploadStore } from "src/stores/useUploadStore";
import { useCatalogStore } from "src/stores/useCatalogStore";
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

    // Zustand globais
    const uploading = useUploadStore((state) => state.uploading);
    
    // Puxando ações e dados da nova store do Catálogo
    const fetchCatalog = useCatalogStore((state) => state.fetchCatalog);

    const { compatibility, checkBackendCompatibility } = useCompatibility();

    const {
        videos,
        loadingVideos,
        selectedVideoId,
        selectedVideo,
        stats,
        setSelectedVideoId,
        fetchVideos,
    } = useVideos(compatibility.status);

    const { fetchTranscription } = useTranscription();
    
    const { resetArtifactSignature } = useAnalysis(selectedVideo, fetchTranscription);

    const selectedVideoIsBusy = selectedVideo?.status.startsWith("PROCESSANDO") ?? false;

    const {
        videoConfig,
        setVideoConfig,
        handleSaveConfig,
        handleReprocess,
    } = useVideoConfig(selectedVideo, fetchVideos);

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
                videos={videos}
                selectedVideoId={selectedVideoId}
                loading={loadingVideos}
                onSelect={setSelectedVideoId}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Conteúdo principal */}
            <div className="dashboard-main">
                {/* Header */}
                <DashboardHeader
                    hasSelectedVideo={!!selectedVideo}
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    onNewUpload={() => setSelectedVideoId(null)}
                />

                {/* Progress Bar */}
                <DashboardProgressBar
                    uploading={uploading}
                    loadingVideos={loadingVideos}
                    selectedVideo={selectedVideo}
                    selectedVideoIsBusy={selectedVideoIsBusy}
                />

                {/* Content Area */}
                <div className="dashboard-content">
                    {selectedVideo ? (
                        // Video Workbench
                        <>
                            <VideoWorkbench
                                video={selectedVideo}
                                config={videoConfig}
                                isBusy={selectedVideoIsBusy}
                                onConfigChange={setVideoConfig}
                                onSaveConfig={handleSaveConfig}
                                onReprocess={handleReprocess}
                                fetchVideos={fetchVideos}
                                fetchTranscription={fetchTranscription}
                                resetArtifactSignature={resetArtifactSignature}
                            />
                        </>
                    ) : (
                        // New Video + Queue
                        <>
                            {/* Stats */}
                            <StatsPanel
                                total={stats.total}
                                processing={stats.processing}
                                processed={stats.processed}
                                errors={stats.errors}
                            />

                            {/* Upload + Queue */}
                            <div className="upload-section">
                                <NewVideoPanel
                                    fetchVideos={fetchVideos}
                                    onRefresh={() => void fetchVideos({ preserveHint: false })}
                                />

                                <ProcessingQueuePanel 
                                    videos={videos} 
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}