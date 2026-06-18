import { useCallback, useEffect, useRef, useState } from "react";

import { useWorkbenchActions } from "../hooks/useWorkbenchActions";
import { useCompatibility } from "../hooks/useCompatibility";
import { useVideos } from "../hooks/useVideos";
import { useCatalog } from "../hooks/useCatalog";
import { useAnalysis } from "../hooks/useAnalysis";
import { useTranscription } from "../hooks/useTranscription";
import { useUpload } from "../hooks/useUpload";
import { useVideoConfig } from "../hooks/useVideoConfig";

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

    const { compatibility, checkBackendCompatibility } = useCompatibility();

    const {
        videos,
        loadingVideos,
        selectedVideoId,
        selectedVideo,
        stats,
        hint,
        setHint,
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
        file,
        setFile,
        uploading,
        message,
        setMessage,
        uploadFrameStride,
        setUploadFrameStride,
        uploadConfidenceThreshold,
        setUploadConfidenceThreshold,
        uploadMaxFrames,
        setUploadMaxFrames,
        uploadClipStart,
        setUploadClipStart,
        uploadClipEnd,
        setUploadClipEnd,
        handleUpload,
    } = useUpload(fetchVideos, setSelectedVideoId, setHint);

    const {
        videoConfig,
        setVideoConfig,
        handleSaveConfig,
        handleReprocess,
    } = useVideoConfig(selectedVideo, fetchVideos, models, setMessage, setHint);

    // Inicializando o nosso novo hook para gerenciar as ações do Workbench
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
                                    file={file}
                                    message={message}
                                    hint={hint}
                                    uploading={uploading}
                                    selectedTask={uploadTask}
                                    selectedModelPath={uploadModelPath}
                                    frameStride={parseInt(uploadFrameStride, 10)}
                                    confidenceThreshold={parseFloat(uploadConfidenceThreshold)}
                                    maxFrames={parseInt(uploadMaxFrames, 10)}
                                    clipStart={parseInt(uploadClipStart, 10)}
                                    clipEnd={uploadClipEnd ? parseInt(uploadClipEnd, 10) : null}
                                    tasks={tasks}
                                    models={models}
                                    onFileChange={setFile}
                                    onTaskChange={handleUploadTaskChange}
                                    onModelChange={setUploadModelPath}
                                    onFrameStrideChange={(val) => setUploadFrameStride(String(val))}
                                    onConfidenceThresholdChange={(val) =>
                                        setUploadConfidenceThreshold(String(val))
                                    }
                                    onMaxFramesChange={(val) => setUploadMaxFrames(String(val))}
                                    onClipStartChange={(val) => setUploadClipStart(String(val))}
                                    onClipEndChange={(val) =>
                                        setUploadClipEnd(val ? String(val) : "")
                                    }
                                    onUpload={() => handleUpload(uploadTask, uploadModelPath)}
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