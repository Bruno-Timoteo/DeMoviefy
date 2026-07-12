// src/pages/Video/components/VideoWorkbench.tsx

import { memo } from "react";
import { useVideoPlayer } from "src/pages/Video/hooks/useVideoPlayer";
import { useVideoDetailStore } from "src/pages/Video/stores/useVideoDetailStore";
import { useAnalysisStore } from "src/pages/Video/stores/useAnalysisStore";
import { useTranscriptionStore } from "src/pages/Video/stores/useTranscriptionStore";

import { WorkbenchHeader } from "src/pages/Video/components/WorkbenchHeader";
import { VideoConfigPanel } from "src/pages/Video/components/VideoConfigPanel";
import { AnalysisEditor } from "src/pages/Video/components/AnalysisEditor";
import { AnalysisHeader } from "src/pages/Video/components/AnalysisHeader";
import { AnalysisResults } from "src/pages/Video/components/AnalysisResults";
import { TranscriptionEditor } from "src/pages/Video/components/TranscriptionEditor";
import { VideoPreviewPanel } from "src/pages/Video/components/VideoPreviewPanel";
import { WorkbenchEmptyState } from "src/pages/Video/components/WorkbenchEmptyState";

import type { AiConfigPayload } from "src/pages/Upload/types";

type VideoWorkbenchProps = {
  config: AiConfigPayload;
  isBusy: boolean;
  onConfigChange: (config: AiConfigPayload) => void;
  onSaveConfig: () => void;
  onReprocess: () => void;
};

export const VideoWorkbench = memo(function VideoWorkbench({
  config,
  isBusy,
  onConfigChange,
  onSaveConfig,
  onReprocess,
}: VideoWorkbenchProps) {

  const video = useVideoDetailStore((state) => state.video);

  const {
    analysis, analysisState, analysisMessage, selectedAnalysisVariantId, analysisDraft,
    setSelectedAnalysisVariantId, setAnalysisDraft,
    onSaveAnalysis, onDeleteAnalysis,
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
    video,
    selectedAnalysisVariantId
  );

  if (!video) return <WorkbenchEmptyState />;

  return (
    <section className="surface inspector-panel">
      <WorkbenchHeader video={video} />

      <div className="inspector-grid">
        <div className="media-panel">
          <VideoPreviewPanel
            video={video}
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
            onVariantChange={setSelectedAnalysisVariantId}
          />

          <AnalysisResults
            state={analysisState}
            summary={summary}
            taskLabel={video.ai_config.task_label}
            modelName={video.ai_config.model_name}
          />

          <div className="editor-grid">
            <VideoConfigPanel
              video={video}
              config={config}
              onConfigChange={onConfigChange}
              isBusy={isBusy}
              onSaveConfig={onSaveConfig}
              onReprocess={onReprocess}
            />

            <AnalysisEditor
              analysisDraft={analysisDraft}
              hasMultipleVariants={hasMultipleAnalysisVariants}
              isBusy={isBusy}
              onDraftChange={setAnalysisDraft}
              onSave={() => onSaveAnalysis()}
              onDelete={() => onDeleteAnalysis()}
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