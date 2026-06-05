import { useCallback, useEffect, useRef, useState } from "react";

import { VideoService } from "../services/videoService"; // Responsável pelas chamadas de API

import { useCompatibility } from "../hooks/useCompatibility"
import { useVideos } from "../hooks/useVideos"
import { useCatalog } from "../hooks/useCatalog";
import { useAnalysis } from "../hooks/useAnalysis";
import { useTranscription } from "../hooks/useTranscription"
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
import "../styles/VideoDashboard.css"
import "../styles/NewVideoPanel.css";
import "../styles/ProcessingQueuePanel.css";
import "../styles/NewDashboardLayout.css";

import { prettifyJson, getApiErrorMessage, buildAnalysisMessage } from "../utils/helpers";

export default function VideoDashboard() {

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const initializedRef = useRef(false);

    const { compatibility, checkBackendCompatibility } = useCompatibility()

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
    } = useVideos(compatibility.status)

    const {
        tasks,
        models,
        uploadTask,
        uploadModelPath,
        setUploadModelPath,
        fetchCatalog,
        handleUploadTaskChange,
    } = useCatalog()

    const {
        transcription,
        setTranscription,
        transcriptionDraft,
        setTranscriptionDraft,
        transcriptionMessage,
        setTranscriptionMessage,
        fetchTranscription,
        resetTranscription,
    } = useTranscription()

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
    } = useAnalysis(selectedVideo, fetchTranscription)

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
    } = useUpload(fetchVideos, setSelectedVideoId, setHint)

    const {
        videoTask,
        videoModelPath,
        setVideoModelPath,
        videoFrameStride,
        setVideoFrameStride,
        videoConfidenceThreshold,
        setVideoConfidenceThreshold,
        videoMaxFrames,
        setVideoMaxFrames,
        videoClipStart,
        setVideoClipStart,
        videoClipEnd,
        setVideoClipEnd,
        handleVideoTaskChange,
        handleSaveConfig,
        handleReprocess,
    } = useVideoConfig(selectedVideo, fetchVideos, models, setMessage, setHint)

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

    const handleSaveAnalysis = useCallback(async () => {
        if (!selectedVideo) {
            return;
        }

        try {
            const parsed = JSON.parse(analysisDraft);
            await VideoService.saveAnalysis(selectedVideo.id, parsed, selectedAnalysisVariantId)

            setAnalysis({
                video_id: selectedVideo.id,
                filename: selectedVideo.filename,
                status: selectedVideo.status,
                selected_variant_id: selectedAnalysisVariantId,
                available_variants: analysis?.available_variants ?? [],
                ai_config: selectedVideo.ai_config,
                storage: selectedVideo.storage,
                analysis: parsed,
            });
            setAnalysisDraft(prettifyJson(parsed));
            setAnalysisState("ready");
            setMessage("Analise salva com sucesso.");
            await fetchVideos();
        } catch (error) {
            console.error(error);
            setMessage(getApiErrorMessage(error, "JSON invalido ou erro ao salvar a analise."));
        }
    }, [selectedVideo, analysisDraft, fetchVideos]);

    const handleDeleteAnalysis = useCallback(async () => {
        if (!selectedVideo) {
            return;
        }

        try {
            await VideoService.deleteAnalysis(selectedVideo.id, selectedAnalysisVariantId)
            setAnalysis(null);
            setSelectedAnalysisVariantId(null);
            setAnalysisDraft("{}");
            setAnalysisState("error");
            setMessage(selectedAnalysisVariantId ? "Versao da analise excluida." : "Analise excluida.");
            await fetchVideos();
        } catch (error) {
            console.error(error);
            setMessage(getApiErrorMessage(error, "Nao foi possivel excluir a analise."));
        }
    }, [selectedVideo, selectedAnalysisVariantId, fetchVideos]);

    const handleDeleteVideo = useCallback(async () => {
        if (!selectedVideo) {
            return;
        }
        try {
            await VideoService.deleteVideo(selectedVideo.id);
            setMessage("Video removido com sucesso.");
            setHint("O arquivo enviado e os artefatos associados foram removidos.");
            setAnalysis(null);
            setAnalysisDraft("{}");
            resetTranscription();
            resetArtifactSignature();
            await fetchVideos();
        } catch (error) {
            console.error(error);
            setMessage(getApiErrorMessage(error, "Nao foi possivel excluir o video."));
        }
    }, [selectedVideo, fetchVideos]);

    const handleSaveTranscription = useCallback(async () => {
        if (!selectedVideo) {
            return;
        }
        try {
            await VideoService.saveTranscription(selectedVideo.id, transcriptionDraft)
            setMessage("Transcricao salva com sucesso.");
            await fetchVideos();
            await fetchTranscription(selectedVideo);
        } catch (error) {
            console.error(error);
            setMessage(getApiErrorMessage(error, "Nao foi possivel salvar a transcricao."));
        }
    }, [selectedVideo, transcriptionDraft, fetchVideos, fetchTranscription]);

    const handleDeleteTranscription = useCallback(async () => {
        if (!selectedVideo) {
            return;
        }
        try {
            await VideoService.deleteTranscription(selectedVideo.id)
            setTranscription(null);
            setTranscriptionDraft("");
            setTranscriptionMessage("Transcricao removida. Voce pode criar uma nova quando quiser.");
            setMessage("Transcricao excluida.");
            await fetchVideos();
        } catch (error) {
            console.error(error);
            setMessage(getApiErrorMessage(error, "Nao foi possivel excluir a transcricao."));
        }
    }, [selectedVideo, fetchVideos]);

    const handleGenerateTranscription = useCallback(async () => {
        if (!selectedVideo) {
            return;
        }

        try {
            setTranscriptionMessage("Gerando transcricao automatica. Isso pode levar alguns instantes.");
            const { message } = await VideoService.generateTranscription(selectedVideo.id)
            setMessage(message)
            await fetchVideos();
            await fetchTranscription(selectedVideo);
        } catch (error) {
            console.error(error);
            setMessage(
                getApiErrorMessage(
                    error,
                    "Nao foi possivel gerar a transcricao automatica. Verifique o Whisper e o ffmpeg.",
                ),
            );
        }
    }, [selectedVideo, fetchVideos, fetchTranscription]);

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
        )
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
                                analysis={analysis}
                                analysisState={analysisState}
                                analysisMessage={buildAnalysisMessage(analysisState, selectedVideo, analysis)}
                                selectedAnalysisVariantId={selectedAnalysisVariantId}
                                selectedTask={videoTask}
                                selectedModelPath={videoModelPath}
                                selectedFrameStride={videoFrameStride}
                                selectedConfidenceThreshold={videoConfidenceThreshold}
                                selectedMaxFrames={videoMaxFrames}
                                selectedClipStart={videoClipStart}
                                selectedClipEnd={videoClipEnd}
                                taskOptions={tasks}
                                modelOptions={models}
                                analysisDraft={analysisDraft}
                                transcription={transcription}
                                transcriptionDraft={transcriptionDraft}
                                transcriptionMessage={transcriptionMessage}
                                isBusy={selectedVideoIsBusy}
                                onAnalysisVariantChange={setSelectedAnalysisVariantId}
                                onTaskChange={handleVideoTaskChange}
                                onModelChange={setVideoModelPath}
                                onFrameStrideChange={setVideoFrameStride}
                                onConfidenceThresholdChange={setVideoConfidenceThreshold}
                                onMaxFramesChange={setVideoMaxFrames}
                                onClipStartChange={setVideoClipStart}
                                onClipEndChange={setVideoClipEnd}
                                onAnalysisDraftChange={setAnalysisDraft}
                                onTranscriptionDraftChange={setTranscriptionDraft}
                                onSaveConfig={handleSaveConfig}
                                onReprocess={handleReprocess}
                                onDeleteVideo={handleDeleteVideo}
                                onSaveAnalysis={handleSaveAnalysis}
                                onDeleteAnalysis={handleDeleteAnalysis}
                                onGenerateTranscription={handleGenerateTranscription}
                                onSaveTranscription={handleSaveTranscription}
                                onDeleteTranscription={handleDeleteTranscription}
                            />
                        </>
                    ) : (
                        // New Video + Queue
                        <>
                            {/* Stats */}
                            
                            <StatsPanel 
                                total = {stats.total}
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
                                    onConfidenceThresholdChange={(val) => setUploadConfidenceThreshold(String(val))}
                                    onMaxFramesChange={(val) => setUploadMaxFrames(String(val))}
                                    onClipStartChange={(val) => setUploadClipStart(String(val))}
                                    onClipEndChange={(val) => setUploadClipEnd(val ? String(val) : "")}
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