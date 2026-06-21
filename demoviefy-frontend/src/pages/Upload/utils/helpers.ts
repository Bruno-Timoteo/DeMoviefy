import type { AxiosError } from "axios";

import type { 
    AIModelOption, 
    AITaskOption, 
    VideoAnalysisResponse, 
    VideoRecord,
    VideoAnalysisVariant
} from "src/pages/Upload/types";

type AnalysisState = "idle" | "loading" | "ready" | "pending" | "error";

// Transforma em JSON

export function prettifyJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

// Pega o erro do axios e o retorna

export function getApiErrorMessage(error: unknown, fallback: string) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    return axiosError.response?.data?.error ?? axiosError.response?.data?.message ?? fallback;
}

// Constrói a mensagem descritiva sobre o estado atual da análise do vídeo.

export function buildAnalysisMessage(
    state: AnalysisState,
    video: VideoRecord | null,
    analysis: VideoAnalysisResponse | null,
) {
    if (!video) {
        return "Escolha um item da biblioteca para abrir preview, analise e transcricao.";
    }

    if (state === "loading") {
        return "Consultando o resumo gerado pelo backend.";
    }

    if (state === "pending") {
        return (
            analysis?.message ??
            `O video ainda esta em processamento (${video.processing.processing_progress}%). ${video.processing.processing_message ?? ""}`.trim()
        );
    }

    if (state === "error") {
        return analysis?.message ?? "Nao foi possivel carregar a analise agora. Voce ainda pode editar ou recriar o JSON.";
    }

    if (!analysis) {
        return "Este video ainda nao possui resumo salvo.";
    }

    return analysis.message ?? `Analise carregada de ${analysis.storage.analysis_relative_path}.`;
}

// Retorna o caminho relativo do diretório para o primeiro modelo encontrado para uma determinada tarefa.

export function chooseFirstModel(models: AIModelOption[], taskType: string): string {
    return models.find((model) => model.task_type === taskType)?.relative_path ?? "";
}

// Define que a tarefa padrão para os modelos é a detecção de objetos.

export function choosePreferredTask(tasks: AITaskOption[]): string {
    return tasks.find((task) => task.task_type === "object_detection")?.task_type ?? tasks[0]?.task_type ?? "object_detection";
}

// Cria uma assinatura única baseada no estado e configurações do vídeo para controlar o cache do useEffect.

export function buildArtifactSignature(video: VideoRecord | null, variantId: string | null) {
    if (!video) {
        return "empty";
    }

    return [
        video.id,
        video.status,
        video.analysis_ready,
        video.transcription_ready,
        video.storage.annotated_exists,
        video.ai_config.task_type,
        video.ai_config.model_relative_path,
        video.ai_config.frame_stride,
        video.ai_config.confidence_threshold,
        video.ai_config.max_frames,
        video.ai_config.clip_start_sec,
        video.ai_config.clip_end_sec ?? "end",
        variantId ?? "latest",
    ].join("|");
}

// Formata horas

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remaining = safe % 60
  return hours > 0
    ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`
    : `${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`
}

export function formatDurationText(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Duração indisponivel";
  }

  if (value < 1) {
    return `Duração aproximada: ${value.toFixed(2)}s`;
  }

  return `Duração aproximada: ${value.toFixed(1)}s`;
}

export function formatPercent(value: number | undefined) {
  if (typeof value !== "number") {
    return "-";
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(1)}s`;
}

export function formatVariantLabel(variant: VideoAnalysisVariant) {
  const createdAt = variant.created_at ? new Date(variant.created_at).toLocaleString() : "Sem data";
  return `${variant.task_label} - ${variant.model_name} - ${createdAt}`;
}