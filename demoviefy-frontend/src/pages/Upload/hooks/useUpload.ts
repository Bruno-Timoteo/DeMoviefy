// src/pages/Upload/hooks/useUpload.ts
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { VideoService } from "src/pages/Upload/services/videoService";
import { getApiErrorMessage } from "src/pages/Upload/utils/helpers";
import { useUploadStore } from "src/core/stores/useUploadStore";
import { useVideoListStore } from "src/pages/Upload/stores/useVideoListStore";

export function useUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadFrameStride, setUploadFrameStride] = useState("8");
  const [uploadConfidenceThreshold, setUploadConfidenceThreshold] = useState("0.35");
  const [uploadMaxFrames, setUploadMaxFrames] = useState("300");
  const [uploadClipStart, setUploadClipStart] = useState("0");
  const [uploadClipEnd, setUploadClipEnd] = useState("");

  const setUploading = useUploadStore((state) => state.setUploading);

  const handleUpload = useCallback(async (uploadTask: string, uploadModelPath: string) => {
    if (!file) {
      toast("Selecione um arquivo antes de enviar.");
      return;
    }

    setUploading(true);
    try {
      const response = await VideoService.uploadVideo(
        file,
        uploadTask,
        uploadModelPath,
        parseInt(uploadFrameStride) || 8,
        parseFloat(uploadConfidenceThreshold) || 0.35,
        parseInt(uploadMaxFrames) || 300,
        parseInt(uploadClipStart) || 0,
        uploadClipEnd.trim() ? parseInt(uploadClipEnd) : null
      );
      toast(response.message);

      setFile(null);
      setUploadFrameStride("8");
      setUploadConfidenceThreshold("0.35");
      setUploadMaxFrames("300");
      setUploadClipStart("0");
      setUploadClipEnd("");

      await useVideoListStore.getState().fetchVideos();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Erro ao enviar o video."));
    } finally {
      setUploading(false);
    }
  }, [file, uploadFrameStride, uploadConfidenceThreshold, uploadMaxFrames, uploadClipStart, uploadClipEnd, setUploading]);

  return {
    file, setFile, uploadFrameStride, setUploadFrameStride,
    uploadConfidenceThreshold, setUploadConfidenceThreshold,
    uploadMaxFrames, setUploadMaxFrames, uploadClipStart, setUploadClipStart,
    uploadClipEnd, setUploadClipEnd, handleUpload
  };
}