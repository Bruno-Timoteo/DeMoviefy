// src/pages/Upload/hooks/useUpload.ts
import { useCallback, useState } from "react";
import { VideoService } from "src/pages/Upload/services/videoService";
import { getApiErrorMessage } from "src/pages/Upload/utils/helpers";
import { useUploadStore } from "src/stores/useUploadStore";
import { useVideoStore } from "src/stores/useVideoStore";

export function useUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadFrameStride, setUploadFrameStride] = useState("8");
  const [uploadConfidenceThreshold, setUploadConfidenceThreshold] = useState("0.35");
  const [uploadMaxFrames, setUploadMaxFrames] = useState("300");
  const [uploadClipStart, setUploadClipStart] = useState("0");
  const [uploadClipEnd, setUploadClipEnd] = useState("");

  const setUploading = useUploadStore((state) => state.setUploading);
  const setMessage = useUploadStore((state) => state.setMessage);
  const setHint = useUploadStore((state) => state.setHint);

  const handleUpload = useCallback(async (uploadTask: string, uploadModelPath: string) => {
    if (!file) {
      setMessage("Selecione um arquivo antes de enviar.");
      setHint("");
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
      setMessage(response.message);
      setHint(
        `Video salvo em ${response.next_steps.video_saved_in}. Análise em ${response.next_steps.analysis_will_be_saved_in}, video anotado em ${response.next_steps.annotated_will_be_saved_in} e transcrição em ${response.next_steps.transcription_will_be_saved_in}.`
      );

      setFile(null);
      setUploadFrameStride("8");
      setUploadConfidenceThreshold("0.35");
      setUploadMaxFrames("300");
      setUploadClipStart("0");
      setUploadClipEnd("");

      await useVideoStore.getState().fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Erro ao enviar o video."));
      setHint("Confira a combinação entre tarefa e modelo e tente novamente.");
    } finally {
      setUploading(false);
    }
  }, [file, uploadFrameStride, uploadConfidenceThreshold, uploadMaxFrames, uploadClipStart, uploadClipEnd, setUploading, setMessage, setHint]);

  return {
    file, setFile, uploadFrameStride, setUploadFrameStride,
    uploadConfidenceThreshold, setUploadConfidenceThreshold,
    uploadMaxFrames, setUploadMaxFrames, uploadClipStart, setUploadClipStart,
    uploadClipEnd, setUploadClipEnd, handleUpload
  };
}