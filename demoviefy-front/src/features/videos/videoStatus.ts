import type { VideoRecord } from "./types";

type ProcessingSnapshot = {
  processing_progress: number;
  processing_stage: string | null;
};

export type VideoStatusTone = "ok" | "processing" | "queued" | "error";

export type VideoStatusMeta = {
  label: "OK" | "Processando" | "Na fila" | "Erro";
  tone: VideoStatusTone;
};

function normalizeStage(stage: string | null | undefined) {
  return stage?.trim().toLowerCase() ?? "";
}

export function getVideoStatusMeta(
  status: string,
  processing?: Partial<ProcessingSnapshot> | null,
): VideoStatusMeta {
  const normalizedStatus = status.trim().toUpperCase();
  const stage = normalizeStage(processing?.processing_stage);
  const progress = typeof processing?.processing_progress === "number" ? processing.processing_progress : 0;

  if (normalizedStatus === "PROCESSADO") {
    return {
      label: "OK",
      tone: "ok",
    };
  }

  if (normalizedStatus.startsWith("ERRO")) {
    return {
      label: "Erro",
      tone: "error",
    };
  }

  if (normalizedStatus === "PROCESSANDO" && (stage === "queued" || progress <= 1)) {
    return {
      label: "Na fila",
      tone: "queued",
    };
  }

  return {
    label: normalizedStatus === "PROCESSANDO" ? "Na fila" : "Processando",
    tone: normalizedStatus === "PROCESSANDO" ? "queued" : "processing",
  };
}

export function isVideoInProcessingQueue(video: Pick<VideoRecord, "status" | "processing">) {
  const meta = getVideoStatusMeta(video.status, video.processing);
  return meta.tone === "queued" || meta.tone === "processing";
}
