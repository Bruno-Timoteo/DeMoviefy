// src/pages/Upload/services/videoService.ts

import { api, toApiUrlWithQuery } from "src/core/services/api";
import type {
    VideoRecord,
    ModelCatalogResponse,
    UploadResponse,
    VideoTranscriptionResponse,
    VideoAnalysisResponse,
    
} from "src/pages/Upload/types";

import { normalizeVideoRecord, normalizeVideoAnalysisResponse } from "src/pages/Upload/utils/normalizers";

import type { AiConfigPayload } from "src/pages/Upload/types";

// Faz as chamadas de vídeo para a API, mantendo os .tsx livres de importar a API diretamente.

export class VideoService {

    static async listVideos(): Promise<VideoRecord[]> {
        const { data } = await api.get<VideoRecord[]>("/videos");
        return data;
    }

    static async listVideosNormalized(): Promise<VideoRecord[]> {
        const videos = await VideoService.listVideos()
        return videos.map((video) => normalizeVideoRecord(video))
    }

    static async getVideoById(id: number): Promise<VideoRecord> {
        const { data } = await api.get<VideoRecord>(`/videos/${id}`);
        return data;
    }

    static async uploadVideo(
        file: File,
        taskType?: string,
        modelPath?: string,
        frameStride?: number,
        confidenceThreshold?: number,
        maxFrames?: number,
        clipStart?: number,
        clipEnd?: number | null
    ): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append("file", file);

        if (taskType) formData.append("task_type", taskType);
        if (modelPath) formData.append("model_path", modelPath);
        if (frameStride !== undefined) formData.append("frame_stride", String(frameStride));
        if (confidenceThreshold !== undefined)
            formData.append("confidence_threshold", String(confidenceThreshold));
        if (maxFrames !== undefined) formData.append("max_frames", String(maxFrames));
        if (clipStart !== undefined) formData.append("clip_start_sec", String(clipStart));
        if (clipEnd !== null && clipEnd !== undefined)
            formData.append("clip_end_sec", String(clipEnd));

        const { data } = await api.post<UploadResponse>("/videos", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
    }

    static async deleteVideo(id: number): Promise<void> {
        await api.delete(`/videos/${id}`);
    }

    static async updateVideoStatus(id: number, status: string): Promise<VideoRecord> {
        const { data } = await api.patch<VideoRecord>(`/videos/${id}`, { status });
        return data;
    }

    static async getModelCatalog(): Promise<ModelCatalogResponse> {
        const { data } = await api.get<ModelCatalogResponse>("/ai/models");
        return data;
    }

    static async getTranscription(transcriptionUrl: string): Promise<{
        data: VideoTranscriptionResponse;
        status: number;
    }> {
        const response = await api.get<VideoTranscriptionResponse>(transcriptionUrl, {
            validateStatus: (status) => status === 200 || status === 204 || status === 404,
        })
        return { data: response.data, status: response.status }
    }

    static async getVideoAnalysis(analysisUrl: string, variantId: string | null): Promise<{
        data: VideoAnalysisResponse
        status: number
    }> {
        const response = await api.get<VideoAnalysisResponse>(analysisUrl, {
            params: variantId ? { variant: variantId } : undefined,
            validateStatus: (status) => status === 200 || status === 202 || status === 404,
        })
        return { data: response.data, status: response.status }
    }

    static async getNormalizedVideoAnalysis(analysisUrl: string, variantId: string | null): Promise<{
        data: VideoAnalysisResponse | null
        status: number
    }> {
        const { data, status } = await VideoService.getVideoAnalysis(analysisUrl, variantId)
        return { data: normalizeVideoAnalysisResponse(data), status }
    }

    static async saveAiConfig(id: number, config: AiConfigPayload): Promise<void> {
        await api.put(`/videos/${id}/ai-config`, config);
    }


    static async reprocessVideo(id: number, config: AiConfigPayload): Promise<void> {
        await api.post(`/videos/${id}/reprocess`, config);
    }

    static async saveAnalysis(id: number, analysis: unknown, variantId: string | null): Promise<void> {
        await api.put(`/videos/${id}/analysis`, { analysis }, {
            params: variantId ? { variant: variantId } : undefined,
        })
    }

    static async deleteAnalysis(id: number, variantId: string | null): Promise<void> {
        await api.delete(`/videos/${id}/analysis`, {
            params: variantId ? { variant: variantId } : undefined,
        })
    }

    static async saveTranscription(id: number, content: string): Promise<void> {
        await api.put(`/videos/${id}/transcription`, { content, source: "manual" })
    }

    static async deleteTranscription(id: number): Promise<void> {
        await api.delete(`/videos/${id}/transcription`)
    }

    static async generateTranscription(id: number): Promise<{ message: string }> {
        const { data } = await api.post<{ message: string }>(`/videos/${id}/transcription/generate`, {})
        return data
    }

    static getAnnotatedVideoUrl(video: VideoRecord, variantId: string | null): string {
        return toApiUrlWithQuery(video.annotated_url, {
            v: video.storage.annotated_exists ? video.created_at ?? video.id : null,
            status: video.status,
            stride: video.ai_config.frame_stride,
            clip_start: video.ai_config.clip_start_sec,
            clip_end: video.ai_config.clip_end_sec ?? "end",
            variant: variantId,
        });
    }

    static getOriginalVideoUrl(video: VideoRecord): string {
        return toApiUrlWithQuery(video.video_url, { v: video.created_at ?? video.id });
    }
}
