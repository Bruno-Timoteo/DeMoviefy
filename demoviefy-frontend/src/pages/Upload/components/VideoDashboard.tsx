// src/pages/Upload/components/VideoDashboard.tsx
import { useCallback, useEffect, useRef, useState } from "react";

import { useCompatibility } from "../hooks/useCompatibility";
import { useVideos } from "../hooks/useVideos";
import { useAnalysis } from "../hooks/useAnalysis";
import { useTranscription } from "../hooks/useTranscription";
import { useVideoConfig } from "../hooks/useVideoConfig";
import { useUploadStore } from "../../../store/useUploadStore";
import { useCatalogStore } from "../../../store/useCatalogStore";

import { CompatibilityBanner } from "./CompatibilityBanner";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardProgressBar } from "./DashboardProgressBar";

import { StatsPanel } from "./StatsPanel";
import { NewVideoPanel } from "./NewVideoPanel";
import { VideoWorkbench } from "./VideoWorkbench";
import { ProcessingQueuePanel } from "./ProcessingQueuePanel";

import "../styles/VideoDashboard.css";
import "../styles/NewVideoPanel.css";
import "../styles/ProcessingQueuePanel.css";
import "../styles/NewDashboardLayout.css";

export default function VideoDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const initializedRef = useRef(false);

    // Zustand globais
    const uploading = useUploadStore((state) => state.uploading);
    const setMessage = useUploadStore((state) => state.setMessage);
    const setHint = useUploadStore((state) => state.setHint);
    
    // Puxando ações e dados da nova store do Catálogo
    const fetchCatalog = useCatalogStore((state) => state.fetchCatalog);
    const models = useCatalogStore((state) => state.models); // 👈 Temporário: apenas para não quebrar o useVideoConfig

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

    // Repare que ainda passamos 'models' aqui. Limparemos isso no próximo passo!
    const {
        videoConfig,
        setVideoConfig,
        handleSaveConfig,
        handleReprocess,
    } = useVideoConfig(selectedVideo, fetchVideos, models, setMessage, setHint);

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

                                <ProcessingQueuePanel videos={videos} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}