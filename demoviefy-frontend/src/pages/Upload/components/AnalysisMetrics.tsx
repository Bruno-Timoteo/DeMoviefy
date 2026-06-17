import { memo } from "react"
import { formatSeconds } from "../utils/helpers"
import type { VideoAnalysisResponse } from "../types"

type AnalysisMetricsProps = {
  summary: NonNullable<VideoAnalysisResponse["analysis"]>
  taskLabel: string
  modelName: string
}

export const AnalysisMetrics = memo(function AnalysisMetrics({
  summary,
  taskLabel,
  modelName,
}: AnalysisMetricsProps) {
  return (
    <div className="analysis-metrics">
      <div className="metric-card">
        <span>Detecções</span>
        <strong>{summary.total_detections}</strong>
      </div>
      <div className="metric-card">
        <span>Frames amostrados</span>
        <strong>{summary.sampled_frames}</strong>
      </div>
      <div className="metric-card">
        <span>Stride / limite</span>
        <strong>{summary.frame_stride} / {summary.max_frames}</strong>
      </div>
      <div className="metric-card">
        <span>Tarefa</span>
        <strong>{taskLabel}</strong>
      </div>
      <div className="metric-card">
        <span>Modelo</span>
        <strong>{modelName}</strong>
      </div>
      <div className="metric-card">
        <span>Trecho</span>
        <strong>
          {formatSeconds(summary.clip_start_sec)} -{" "}
          {summary.clip_end_sec === null ? "fim" : formatSeconds(summary.clip_end_sec)}
        </strong>
      </div>
      <div className="metric-card">
        <span>Confiança mínima</span>
        <strong>
          {typeof summary.confidence_threshold === "number"
            ? `${(summary.confidence_threshold * 100).toFixed(0)}%`
            : "-"}
        </strong>
      </div>
    </div>
  )
})