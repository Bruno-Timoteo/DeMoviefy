// src/pages/Video/components/VideoWorkbench.tsx

import { memo } from "react";

import { useVideoPlayer } from "src/pages/Video/hooks/useVideoPlayer";
import { useAnalysisStore } from "src/pages/Video/stores/useAnalysisStore";
import { useTranscriptionStore } from "src/pages/Video/stores/useTranscriptionStore";
import { useProcessingStore } from "src/core/stores/useProcessingStore";
import { useVideoWorkbenchSync } from "src/pages/Video/hooks/useVideoWorkbenchSync";

import { WorkbenchHeader } from "src/pages/Video/components/WorkbenchHeader";
import { VideoConfigPanel } from "src/pages/Video/components/VideoConfigPanel";
import { AnalysisEditor } from "src/pages/Video/components/AnalysisEditor";
import { AnalysisHeader } from "src/pages/Video/components/AnalysisHeader";
import { AnalysisResults } from "src/pages/Video/components/AnalysisResults";
import { TranscriptionEditor } from "src/pages/Video/components/TranscriptionEditor";
import { VideoPreviewPanel } from "src/pages/Video/components/VideoPreviewPanel";
import { WorkbenchEmptyState } from "src/pages/Video/components/WorkbenchEmptyState";

import type { AiConfigPayload, VideoRecord } from "src/core/types/videoTypes";

type VideoWorkbenchProps = {
    video: VideoRecord | null;
  config: AiConfigPayload;
  isBusy: boolean;
  onConfigChange: (config: AiConfigPayload) => void;
  onSaveConfig: () => void;
  onReprocess: () => void;
};

export const VideoWorkbench = memo(function VideoWorkbench({
    video,
  config,
  isBusy,
  onConfigChange,
  onSaveConfig,
  onReprocess,
}: VideoWorkbenchProps) {

    const processingVideo = useProcessingStore((state) =>
        state.videos.find((item) => item.id === video?.id)
    );

    const currentVideo = processingVideo ?? video; // Essa linha faz com que o poller seja atualizado.

    useVideoWorkbenchSync(currentVideo);

  const {
    analysis, analysisState, analysisMessage, selectedAnalysisVariantId, analysisDraft,
    setSelectedAnalysisVariantId, setAnalysisDraft,
    onDeleteAnalysis,
  } = useAnalysisStore();

  const {
    transcription, transcriptionDraft, transcriptionMessage,
    setTranscriptionDraft,
    onSaveTranscription, onDeleteTranscription, onGenerateTranscription,
  } = useTranscriptionStore();

  const summary = analysis?.analysis ?? null;
  const analysisVariants = analysis?.available_variants ?? [];
  const hasMultipleAnalysisVariants = analysisVariants.length > 1;
  const transcriptionSegments = transcription?.transcription.segments ?? [];
  const hasSelectedAnalysis = analysis !== null;

  const { videoRef, annotatedVideoSrc, originalVideoSrc, seekTo } = useVideoPlayer(
    currentVideo,
    selectedAnalysisVariantId
  );

  if (!currentVideo) return <WorkbenchEmptyState />;
  return (
    <section className="surface inspector-panel">
      <WorkbenchHeader video={currentVideo} />

      <div className="inspector-grid">
        <div className="media-panel">

          <VideoPreviewPanel
            video={currentVideo}
            analysisState={analysisState}
            hasSelectedAnalysis={hasSelectedAnalysis}
            originalVideoSrc={originalVideoSrc}
            annotatedVideoSrc={annotatedVideoSrc}
            videoRef={videoRef}
          />

        </div>

        <div className="analysis-panel">
          <AnalysisHeader
            message={analysisMessage}
            variants={analysisVariants}
            selectedVariantId={selectedAnalysisVariantId}
            onVariantChange={(id) => {
                setSelectedAnalysisVariantId(id, currentVideo);

                // Gambiarra para, quando trocar a análise, ele ir para o topo.
                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
            }}
        />

          <AnalysisResults
            state={analysisState}
            summary={summary}
            taskLabel={currentVideo.ai_config.task_label}
            modelName={currentVideo.ai_config.model_name}
          />

          <div className="editor-grid">
            <VideoConfigPanel
              video={currentVideo}
              config={config}
              onConfigChange={onConfigChange}
              isBusy={isBusy}
              onSaveConfig={onSaveConfig}
              onReprocess={onReprocess}
            />

            <AnalysisEditor
              analysisDraft={analysisDraft}
              hasMultipleVariants={hasMultipleAnalysisVariants}
              onDraftChange={setAnalysisDraft}
              onDelete={() => onDeleteAnalysis(currentVideo)}
            />

            <TranscriptionEditor
              transcriptionDraft={transcriptionDraft}
              transcriptionMessage={transcriptionMessage}
              segments={transcriptionSegments}
              isBusy={isBusy}
              onDraftChange={setTranscriptionDraft}
              onSave={() => onSaveTranscription()}
              onDelete={() => onDeleteTranscription()}
              onGenerate={() => onGenerateTranscription()}
              onSeek={seekTo}
            />
          </div>
        </div>
      </div>
    </section>
  );
});