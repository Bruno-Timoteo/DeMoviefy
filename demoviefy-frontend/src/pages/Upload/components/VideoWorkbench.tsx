// src/pages/Upload/components/VideoWorkbench.tsx
import { memo } from "react";
import { useVideoPlayer } from "src/pages/Upload/hooks/useVideoPlayer";
import { useWorkbenchStore } from "../../../stores/useWorkbenchStore";

import { WorkbenchHeader } from "./WorkbenchHeader";
import { VideoConfigPanel } from "./VideoConfigPanel";
import { AnalysisEditor } from "./AnalysisEditor";
import { AnalysisHeader } from "./AnalysisHeader";
import { AnalysisResults } from "./AnalysisResults";
import { TranscriptionEditor } from "./TranscriptionEditor";
import { VideoPreviewPanel } from "./VideoPreviewPanel";
import { WorkbenchEmptyState } from "./WorkbenchEmptyState";

import type { AiConfigPayload, VideoRecord } from "src/pages/Upload/types";

type VideoWorkbenchProps = {
  video: VideoRecord | null;
  config: AiConfigPayload;
  isBusy: boolean;
  onConfigChange: (config: AiConfigPayload) => void;
  onSaveConfig: () => void;
  onReprocess: () => void;
  fetchVideos: () => Promise<void>;
  fetchTranscription: (video: VideoRecord) => Promise<void>;
  resetArtifactSignature: () => void;
};

export const VideoWorkbench = memo(function VideoWorkbench({
  video,
  config,
  isBusy,
  onConfigChange,
  onSaveConfig,
  onReprocess,
  fetchVideos,
  fetchTranscription,
  resetArtifactSignature,
}: VideoWorkbenchProps) {
  

  // Conectando com o Zustand do Workbench
  const {
    analysis, analysisState, analysisMessage, selectedAnalysisVariantId, analysisDraft,
    transcription, transcriptionDraft, transcriptionMessage,
    setSelectedAnalysisVariantId, setAnalysisDraft, setTranscriptionDraft,
    onSaveAnalysis, onDeleteAnalysis, onDeleteVideo, onSaveTranscription, onDeleteTranscription, onGenerateTranscription
  } = useWorkbenchStore();

  const summary = analysis?.analysis ?? null;
  const analysisVariants = analysis?.available_variants ?? [];
  const hasMultipleAnalysisVariants = analysisVariants.length > 1;
  const transcriptionSegments = transcription?.transcription.segments ?? [];

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
            summary={summary}
            analysisState={analysisState}
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
              onDeleteVideo={() => onDeleteVideo(video, fetchVideos, resetArtifactSignature)}
            />

            <AnalysisEditor
              analysisDraft={analysisDraft}
              hasMultipleVariants={hasMultipleAnalysisVariants}
              isBusy={isBusy}
              onDraftChange={setAnalysisDraft}
              onSave={() => onSaveAnalysis(video, fetchVideos)}
              onDelete={() => onDeleteAnalysis(video, fetchVideos)}
            />

            <TranscriptionEditor
              transcriptionDraft={transcriptionDraft}
              transcriptionMessage={transcriptionMessage}
              segments={transcriptionSegments}
              isBusy={isBusy}
              onDraftChange={setTranscriptionDraft}
              onSave={() => onSaveTranscription(video, fetchVideos, fetchTranscription)}
              onDelete={() => onDeleteTranscription(video, fetchVideos)}
              onGenerate={() => onGenerateTranscription(video, fetchVideos, fetchTranscription)}
              onSeek={seekTo}
            />
          </div>
        </div>
      </div>
    </section>
  );
});