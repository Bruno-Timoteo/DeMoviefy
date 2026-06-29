// src/pages/Upload/components/AnalysisDetectionTable.tsx

import { memo } from "react"
import { formatPercent } from "src/pages/Upload/utils/helpers"
import type { VideoAnalysisResponse } from "src/pages/Upload/types"

type AnalysisDetectionTableProps = {
  summary: NonNullable<VideoAnalysisResponse["analysis"]>
}

export const AnalysisDetectionTable = memo(function AnalysisDetectionTable({ 
  summary 
}: AnalysisDetectionTableProps) {
  return (
    <div className="label-table">
      <div className="label-table-header">
        <span>Classe</span>
        <span>Ocorrências</span>
        <span>Confiança média</span>
      </div>
      {Object.keys(summary.label_counts).length === 0 && (
        <div className="label-table-row muted-row">
          <span>Nenhuma detecção encontrada</span>
          <span>0</span>
          <span>-</span>
        </div>
      )}
      {Object.entries(summary.label_counts).map(([label, count]) => (
        <div key={label} className="label-table-row">
          <span>{label}</span>
          <span>{count}</span>
          <span>{formatPercent(summary.avg_confidence_by_label[label])}</span>
        </div>
      ))}
    </div>
  )
})