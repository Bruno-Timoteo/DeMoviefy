// src/pages/Dashboard/services/videoUploadService.ts
import { api } from "src/core/services/api";

import type { UploadResponse } from "src/pages/Dashboard/types/uploadTypes";
export class VideoUploadService {

    static async cancelProcessing(id: number): Promise<void> {
        await api.post(`/videos/${id}/cancel`);
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
            console.log(data);
            return data;
        }
}