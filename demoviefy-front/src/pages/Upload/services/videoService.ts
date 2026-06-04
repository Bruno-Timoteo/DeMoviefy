import { api, frontendAppVersion, frontendApiContractVersion } from "../../../services/api";
import type {
  VideoRecord,
  BackendVersionResponse,
  ModelCatalogResponse,
  UploadResponse,
} from "../types";

/**
 * Video Service
 * Centralized API client for video operations
 */

export class VideoService {
  static async listVideos(): Promise<VideoRecord[]> {
    const { data } = await api.get<VideoRecord[]>("/videos");
    return data;
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


  // Pega dados sobre a versão do backend

  static async getSystemVersion(): Promise<BackendVersionResponse> {
    const { data } = await api.get<BackendVersionResponse>("/system/version");
    return data;
  }
  
  // Verifica a compatibilidade entre as duas
  
  static async checkCompatibility(): Promise<{
    isCompatible: boolean;
    backendInfo: BackendVersionResponse | null
    reason: "compatible" | "mismatch" | "unavailable"
  }> {
    try {
        const backendInfo = await VideoService.getSystemVersion();
        const isCompatible =  backendInfo.api_contract_version == frontendApiContractVersion;

        return {
            isCompatible,
            backendInfo,
            reason: isCompatible ? "compatible" : "mismatch",
        }
    }

    catch {
        return {isCompatible: false, backendInfo: null, reason: "unavailable"}
    }
  }

  static async getModelCatalog(): Promise<ModelCatalogResponse> {
    const { data } = await api.get<ModelCatalogResponse>("/ai/models");
    return data;
  }

  static async getVideoStats(): Promise<{
    total: number;
    processing: number;
    processed: number;
    errors: number;
  }> {
    try {
      const videos = await this.listVideos();
      return {
        total: videos.length,
        processing: videos.filter((v) => v.status.startsWith("PROCESSANDO")).length,
        processed: videos.filter((v) => v.status === "PROCESSADO").length,
        errors: videos.filter((v) => v.status.startsWith("ERRO")).length,
      };
    } catch {
      return { total: 0, processing: 0, processed: 0, errors: 0 };
    }
  }
}
