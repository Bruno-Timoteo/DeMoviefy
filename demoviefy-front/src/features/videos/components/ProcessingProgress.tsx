import { memo } from "react";

type ProcessingProgressProps = {
  progress: number;
  stage: string;
  etaSeconds: number | null;
  message: string | null;
};

const PIPELINE_STEPS = [
  { id: "queued", label: "Fila" },
  { id: "preparing", label: "Preparacao" },
  { id: "analyzing", label: "Analise" },
  { id: "analysis_complete", label: "Artefatos" },
  { id: "transcribing", label: "Transcricao" },
  { id: "completed", label: "Concluido" },
] as const;

const STAGE_INDEX: Record<string, number> = {
  idle: -1,
  queued: 0,
  preparing: 1,
  analyzing: 2,
  analysis_complete: 3,
  transcribing: 4,
  transcription_skipped: 4,
  completed: 5,
  error: 5,
};

function formatEta(value: number | null) {
  if (value === null || value <= 0) {
    return "Finalizando...";
  }

  if (value < 60) {
    return `~${value}s restantes`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `~${minutes}m ${seconds}s restantes`;
}

export const ProcessingProgress = memo(function ProcessingProgress({
  progress,
  stage,
  etaSeconds,
  message,
}: ProcessingProgressProps) {
  const safeProgress = Math.max(0, Math.min(progress, 100));
  const currentIndex = STAGE_INDEX[stage] ?? -1;

  const currentStep = PIPELINE_STEPS.find((item) => item.id === stage)?.label ?? stage;
  const displayStage = currentStep === "completed" ? "Concluído" : currentStep;

  return (
    <div className="processing-progress">
      <div className="processing-progress-header">
        <div className="progress-metrics">
          <strong>{safeProgress}%</strong>
          <span>{displayStage}</span>
        </div>
        <span className="progress-eta">{formatEta(etaSeconds)}</span>
      </div>

      <div className="progress-bar" aria-hidden="true">
        <span style={{ width: `${safeProgress}%` }} />
      </div>

      <div className="pipeline-steps" aria-label="Etapas do processamento">
        {PIPELINE_STEPS.map((step, index) => {
          const isDone = index < currentIndex || stage === "completed";
          const isCurrent =
            stage === step.id ||
            (stage === "transcription_skipped" && step.id === "transcribing") ||
            (stage === "error" && index === Math.max(currentIndex, 0));

          return (
            <span
              key={step.id}
              className={`pipeline-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
            >
              <span className="step-indicator" />
              <span className="step-label">{step.label}</span>
            </span>
          );
        })}
      </div>

      <small>{message ?? "Aguardando proximo status..."}</small>
    </div>
  );
});
