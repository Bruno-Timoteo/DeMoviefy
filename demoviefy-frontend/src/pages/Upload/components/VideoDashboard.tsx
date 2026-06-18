import { useCallback, useEffect, useRef, useState } from "react";

import { useCompatibility } from "../hooks/useCompatibility";
import { useVideos } from "../hooks/useVideos";
import { useCatalog } from "../hooks/useCatalog";
import { useAnalysis } from "../hooks/useAnalysis";
import { useTranscription } from "../hooks/useTranscription";
import { useVideoConfig } from "../hooks/useVideoConfig";
import { useUploadStore } from "../../../store/useUploadStore";

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

    const uploading = useUploadStore((state) => state.uploading);
    const setMessage = useUploadStore((state) => state.setMessage);
    const setHint = useUploadStore((state) => state.setHint);

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

    const {
        tasks,
        models,
        uploadTask,
        uploadModelPath,
        setUploadModelPath,
        fetchCatalog,
        handleUploadTaskChange,
    } = useCatalog();

    const {
        fetchTranscription,
    } = useTranscription();

    const {
        resetArtifactSignature,
    } = useAnalysis(selectedVideo, fetchTranscription);

    const selectedVideoIsBusy = selectedVideo?.status.startsWith("PROCESSANDO") ?? false;

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

                {/* Progress Bar usando o estado global do Zustand */}
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
                                taskOptions={tasks}
                                modelOptions={models}
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
                                    tasks={tasks}
                                    models={models}
                                    selectedTask={uploadTask}
                                    selectedModelPath={uploadModelPath}
                                    onTaskChange={handleUploadTaskChange}
                                    onModelChange={setUploadModelPath}
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