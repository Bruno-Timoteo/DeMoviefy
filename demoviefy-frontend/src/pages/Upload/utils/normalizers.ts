import type {
    VideoRecord,
    VideoAnalysisResponse,
    VideoAnalysisVariant
} from "src/pages/Upload/types";

import { DEFAULT_PROCESSING, DEFAULT_AI_CONFIG } from "src/pages/Upload/constants";

export function normalizeVideoRecord(video: Partial<VideoRecord>): VideoRecord {
    return {
        id: video.id ?? 0,
        filename: video.filename ?? "video_sem_nome.mp4",
        status: video.status ?? "PROCESSANDO",
        created_at: video.created_at ?? null,
        analysis_ready: Boolean(video.analysis_ready),
        transcription_ready: Boolean(video.transcription_ready),
        video_url: video.video_url ?? "",
        annotated_url: video.annotated_url ?? "",
        analysis_url: video.analysis_url ?? "",
        transcription_url: video.transcription_url ?? "",
        ai_config: {
            ...DEFAULT_AI_CONFIG,
            ...(video.ai_config ?? {}),
        },
        processing: {
            ...DEFAULT_PROCESSING,
            ...(video.processing ?? {}),
        },
        storage: {
            video_relative_path: video.storage?.video_relative_path ?? "",
            video_absolute_path: video.storage?.video_absolute_path ?? "",
            video_exists: Boolean(video.storage?.video_exists),
            analysis_relative_path: video.storage?.analysis_relative_path ?? "",
            analysis_absolute_path: video.storage?.analysis_absolute_path ?? "",
            analysis_exists: Boolean(video.storage?.analysis_exists),
            annotated_relative_path: video.storage?.annotated_relative_path ?? "",
            annotated_absolute_path: video.storage?.annotated_absolute_path ?? "",
            annotated_exists: Boolean(video.storage?.annotated_exists),
            transcription_relative_path: video.storage?.transcription_relative_path ?? "",
            transcription_absolute_path: video.storage?.transcription_absolute_path ?? "",
            transcription_exists: Boolean(video.storage?.transcription_exists),
        },
    };
}

export function normalizeVideoAnalysisResponse(response: VideoAnalysisResponse | null): VideoAnalysisResponse | null {
    if (!response) {
        return null;
    }

    return {
        ...response,
        selected_variant_id: response.selected_variant_id ?? null,
        available_variants: (response.available_variants ?? []).map((variant): VideoAnalysisVariant => ({
            variant_id: variant.variant_id,
            created_at: variant.created_at ?? null,
            task_type: variant.task_type ?? "object_detection",
            task_label: variant.task_label ?? variant.task_type ?? "Analise",
            model_name: variant.model_name ?? "Modelo nao informado",
            frame_stride: variant.frame_stride ?? 0,
            clip_start_sec: variant.clip_start_sec ?? 0,
            clip_end_sec: variant.clip_end_sec ?? null,
        })),
        ai_config: {
            ...DEFAULT_AI_CONFIG,
            ...(response.ai_config ?? {}),
        },
        analysis: {
            video_path: response.analysis?.video_path ?? "",
            model_path: response.analysis?.model_path ?? "",
            task_type: response.analysis?.task_type ?? "object_detection",
            frame_stride: response.analysis?.frame_stride ?? 8,
            confidence_threshold: response.analysis?.confidence_threshold ?? 0.35,
            max_frames: response.analysis?.max_frames ?? 300,
            clip_start_sec: response.analysis?.clip_start_sec ?? 0,
            clip_end_sec: response.analysis?.clip_end_sec ?? null,
            video_duration_sec: response.analysis?.video_duration_sec ?? null,
            sampled_frames: response.analysis?.sampled_frames ?? 0,
            processed_frames: response.analysis?.processed_frames ?? 0,
            total_detections: response.analysis?.total_detections ?? 0,
            label_counts: response.analysis?.label_counts ?? {},
            avg_confidence_by_label: response.analysis?.avg_confidence_by_label ?? {},
            top_labels: response.analysis?.top_labels ?? [],
        },
        storage: {
            video_relative_path: response.storage?.video_relative_path ?? "",
            video_absolute_path: response.storage?.video_absolute_path ?? "",
            video_exists: Boolean(response.storage?.video_exists),
            analysis_relative_path: response.storage?.analysis_relative_path ?? "",
            analysis_absolute_path: response.storage?.analysis_absolute_path ?? "",
            analysis_exists: Boolean(response.storage?.analysis_exists),
            annotated_relative_path: response.storage?.annotated_relative_path ?? "",
            annotated_absolute_path: response.storage?.annotated_absolute_path ?? "",
            annotated_exists: Boolean(response.storage?.annotated_exists),
            transcription_relative_path: response.storage?.transcription_relative_path ?? "",
            transcription_absolute_path: response.storage?.transcription_absolute_path ?? "",
            transcription_exists: Boolean(response.storage?.transcription_exists),
        },
    };
}