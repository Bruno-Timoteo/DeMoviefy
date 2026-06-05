import { useCallback, useState } from "react"
import { VideoService } from "../services/videoService"
import { getApiErrorMessage } from "../utils/helpers"

export function useUpload(
  fetchVideos: () => Promise<void>,
  setSelectedVideoId: (id: number | null) => void,
  setHint: (hint: string) => void,
) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [uploadFrameStride, setUploadFrameStride] = useState("8")
  const [uploadConfidenceThreshold, setUploadConfidenceThreshold] = useState("0.35")
  const [uploadMaxFrames, setUploadMaxFrames] = useState("300")
  const [uploadClipStart, setUploadClipStart] = useState("0")
  const [uploadClipEnd, setUploadClipEnd] = useState("")

  const handleUpload = useCallback(async (uploadTask: string, uploadModelPath: string) => {
    if (!file) {
      setMessage("Selecione um arquivo antes de enviar.")
      setHint("")
      return
    }

    setUploading(true)
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
      )

      setMessage(response.message)
      setHint(
        `Video salvo em ${response.next_steps.video_saved_in}. Analise em ${response.next_steps.analysis_will_be_saved_in}, video anotado em ${response.next_steps.annotated_will_be_saved_in} e transcricao em ${response.next_steps.transcription_will_be_saved_in}.`
      )
      setFile(null)
      setUploadFrameStride("8")
      setUploadConfidenceThreshold("0.35")
      setUploadMaxFrames("300")
      setUploadClipStart("0")
      setUploadClipEnd("")
      await fetchVideos()
      setSelectedVideoId(null)
    } catch (error) {
      console.error(error)
      setMessage(getApiErrorMessage(error, "Erro ao enviar o video."))
      setHint("Confira a combinacao entre tarefa e modelo e tente novamente.")
    } finally {
      setUploading(false)
    }
  }, [file, uploadFrameStride, uploadConfidenceThreshold, uploadMaxFrames, uploadClipStart, uploadClipEnd, fetchVideos, setSelectedVideoId, setHint])

  return {
    file,
    setFile,
    uploading,
    message,
    setMessage,
    uploadFrameStride,
    setUploadFrameStride,
    uploadConfidenceThreshold,
    setUploadConfidenceThreshold,
    uploadMaxFrames,
    setUploadMaxFrames,
    uploadClipStart,
    setUploadClipStart,
    uploadClipEnd,
    setUploadClipEnd,
    handleUpload,
  }
}