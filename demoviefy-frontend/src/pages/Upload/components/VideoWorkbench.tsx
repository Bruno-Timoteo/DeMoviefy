import { memo, useRef } from "react"
import { StatusBadge } from "./StatusBadge"
import { ProcessingProgress } from "./ProcessingProgress"
import { VideoConfigPanel } from "./VideoConfigPanel"
import { AnalysisEditor } from "./AnalysisEditor"
import { AnalysisHeader } from "./AnalysisHeader"
import { AnalysisResults } from "./AnalysisResults"
import { TranscriptionEditor } from "./TranscriptionEditor"
import { VideoPreviewPanel } from "./VideoPreviewPanel"
import { WorkbenchEmptyState } from "./WorkbenchEmptyState"
import { toApiUrlWithQuery } from "../../../services/api"

import type {
  AiConfigPayload,
  AIModelOption,
  AITaskOption,
  VideoAnalysisResponse,
  VideoRecord,
  VideoTranscriptionResponse,
} from "../types"

type VideoWorkbenchProps = {
  video: VideoRecord | null
  analysis: VideoAnalysisResponse | null
  analysisState: "idle" | "loading" | "ready" | "pending" | "error"
  analysisMessage: string
  selectedAnalysisVariantId: string | null
  config: AiConfigPayload
  taskOptions: AITaskOption[]
  modelOptions: AIModelOption[]
  analysisDraft: string
  transcription: VideoTranscriptionResponse | null
  transcriptionDraft: string
  transcriptionMessage: string
  isBusy: boolean
  onAnalysisVariantChange: (variantId: string | null) => void
  onAnalysisDraftChange: (value: string) => void
  onTranscriptionDraftChange: (value: string) => void
  onSaveConfig: () => void
  onReprocess: () => void
  onDeleteVideo: () => void
  onSaveAnalysis: () => void
  onDeleteAnalysis: () => void
  onGenerateTranscription: () => void
  onSaveTranscription: () => void
  onDeleteTranscription: () => void
  onConfigChange: (config: AiConfigPayload) => void
}

export const VideoWorkbench = memo(function VideoWorkbench({
  video,
  analysis,
  analysisState,
  analysisMessage,
  selectedAnalysisVariantId,
  config,
  taskOptions,
  modelOptions,
  analysisDraft,
  transcription,
  transcriptionDraft,
  transcriptionMessage,
  isBusy,
  onConfigChange,
  onAnalysisVariantChange,
  onAnalysisDraftChange,
  onTranscriptionDraftChange,
  onSaveConfig,
  onReprocess,
  onDeleteVideo,
  onSaveAnalysis,
  onDeleteAnalysis,
  onGenerateTranscription,
  onSaveTranscription,
  onDeleteTranscription,
}: VideoWorkbenchProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const summary = analysis?.analysis ?? null
  const analysisVariants = analysis?.available_variants ?? []
  const hasMultipleAnalysisVariants = analysisVariants.length > 1
  const transcriptionSegments = transcription?.transcription.segments ?? []

  const annotatedVideoSrc = video
    ? toApiUrlWithQuery(video.annotated_url, {
        v: video.storage.annotated_exists ? video.created_at ?? video.id : null,
        status: video.status,
        stride: video.ai_config.frame_stride,
        clip_start: video.ai_config.clip_start_sec,
        clip_end: video.ai_config.clip_end_sec ?? "end",
        variant: selectedAnalysisVariantId,
      })
    : ""

  const originalVideoSrc = video
    ? toApiUrlWithQuery(video.video_url, { v: video.created_at ?? video.id })
    : ""


  if (!video) return <WorkbenchEmptyState />

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = seconds
    void videoRef.current.play().catch(() => undefined)
  }

  return (
    <section className="surface inspector-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Workbench</span>
          <h2>{video.filename}</h2>
        </div>
        <StatusBadge status={video.status} />
      </div>

      {video.status.startsWith("PROCESSANDO") && (
        <ProcessingProgress
          progress={video.processing.processing_progress}
          stage={video.processing.processing_stage}
          etaSeconds={video.processing.processing_eta_seconds}
          message={video.processing.processing_message}
        />
      )}

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
            onVariantChange={onAnalysisVariantChange}
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
              taskOptions={taskOptions}
              modelOptions={modelOptions}
              isBusy={isBusy}
              onSaveConfig={onSaveConfig}
              onReprocess={onReprocess}
              onDeleteVideo={onDeleteVideo}
            />

            <AnalysisEditor
              analysisDraft={analysisDraft}
              hasMultipleVariants={hasMultipleAnalysisVariants}
              isBusy={isBusy}
              onDraftChange={onAnalysisDraftChange}
              onSave={onSaveAnalysis}
              onDelete={onDeleteAnalysis}
            />

            <TranscriptionEditor
              transcriptionDraft={transcriptionDraft}
              transcriptionMessage={transcriptionMessage}
              segments={transcriptionSegments}
              isBusy={isBusy}
              onDraftChange={onTranscriptionDraftChange}
              onSave={onSaveTranscription}
              onDelete={onDeleteTranscription}
              onGenerate={onGenerateTranscription}
              onSeek={seekTo}
            />
          </div>
        </div>
      </div>
    </section>
  )
})