import { AnalysisMetrics } from "./AnalysisMetrics"
import { AnalysisDetectionTable } from "./AnalysisDetectionTable"
import type { VideoAnalysisResponse } from "../types"

type AnalysisResultsProps = {
  state: "idle" | "loading" | "ready" | "pending" | "error"
  summary: NonNullable<VideoAnalysisResponse["analysis"]> | null
  taskLabel: string
  modelName: string
}

export function AnalysisResults({
  state,
  summary,
  taskLabel,
  modelName,
}: AnalysisResultsProps) {
  // 1. Se estiver carregando, devolvemos o skeleton
  if (state === "loading") {
    return <div className="skeleton-block" />
  }

  // 2. Se a análise terminou mas não tem resumo válido, não renderizamos nada
  if (!summary) {
    return null
  }

  // 3. Se deu tudo certo, exibimos os dois componentes que acabamos de criar!
  return (
    <>
      <AnalysisMetrics
        summary={summary}
        taskLabel={taskLabel}
        modelName={modelName}
      />
      <AnalysisDetectionTable summary={summary} />
    </>
  )
}