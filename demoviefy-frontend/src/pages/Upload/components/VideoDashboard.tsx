import { useCallback, useEffect, useRef, useState } from "react";

import { useWorkbenchActions } from "../hooks/useWorkbenchActions";
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

import { buildAnalysisMessage } from "../utils/helpers";

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
        transcription,
        setTranscription,
        transcriptionDraft,
        setTranscriptionDraft,
        transcriptionMessage,
        setTranscriptionMessage,
        fetchTranscription,
        resetTranscription,
    } = useTranscription();

    const {
        analysis,
        setAnalysis,
        selectedAnalysisVariantId,
        setSelectedAnalysisVariantId,
        analysisState,
        setAnalysisState,
        analysisDraft,
        setAnalysisDraft,
        resetArtifactSignature,
    } = useAnalysis(selectedVideo, fetchTranscription);

    const selectedVideoIsBusy = selectedVideo?.status.startsWith("PROCESSANDO") ?? false;

    const {
        videoConfig,
        setVideoConfig,
        handleSaveConfig,
        handleReprocess,
    } = useVideoConfig(selectedVideo, fetchVideos, models, setMessage, setHint);

    const workbenchActions = useWorkbenchActions({
        selectedVideo,
        selectedAnalysisVariantId,
        analysisDraft,
        transcriptionDraft,
        setAnalysis,
        setAnalysisDraft,
        setAnalysisState,
        setSelectedAnalysisVariantId,
        setTranscription,
        setTranscriptionDraft,
        setTranscriptionMessage,
        setMessage,
        setHint,
        fetchVideos,
        fetchTranscription,
        resetTranscription,
        resetArtifactSignature,
    });

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
                                analysis={analysis}
                                analysisState={analysisState}
                                analysisMessage={buildAnalysisMessage(
                                    analysisState,
                                    selectedVideo,
                                    analysis
                                )}
                                selectedAnalysisVariantId={selectedAnalysisVariantId}
                                taskOptions={tasks}
                                modelOptions={models}
                                analysisDraft={analysisDraft}
                                transcription={transcription}
                                transcriptionDraft={transcriptionDraft}
                                transcriptionMessage={transcriptionMessage}
                                isBusy={selectedVideoIsBusy}
                                onAnalysisVariantChange={setSelectedAnalysisVariantId}
                                onAnalysisDraftChange={setAnalysisDraft}
                                onTranscriptionDraftChange={setTranscriptionDraft}
                                onSaveConfig={handleSaveConfig}
                                onConfigChange={setVideoConfig}
                                onReprocess={handleReprocess}
                                {...workbenchActions}
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