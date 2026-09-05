// src/pages/Dashboard/hooks/useUpload.ts
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { VideoService } from "src/core/services/videoService";
import { getApiErrorMessage } from "src/core/utils/videoHelpers";
import { useUploadStore } from "src/core/stores/useUploadStore";
import { useProcessingStore } from "src/core/stores/useProcessingStore";

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
        toast("Upload iniciado")
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

      setFile(null);
      setUploadFrameStride("8");
      setUploadConfidenceThreshold("0.35");
      setUploadMaxFrames("300");
      setUploadClipStart("0");
      setUploadClipEnd("");

      await useProcessingStore.getState().refresh()
      
      toast.success(response.message);

    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Erro no upload do video."));
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