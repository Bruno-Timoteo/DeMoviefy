import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AxiosError } from "axios";

import { api, frontendApiContractVersion, frontendAppVersion } from "../../services/api";
import { UploadComposerPanel } from "./components/UploadComposerPanel";
import { VideoLibrary } from "./components/VideoLibrary";
import { VideoWorkbench } from "./components/VideoWorkbench";
import type {
  AIModelOption,
  AITaskOption,
  BackendVersionResponse,
  ModelCatalogResponse,
  UploadResponse,
  VideoAnalysisResponse,
  VideoRecord,
  VideoTranscriptionResponse,
} from "./types";

type AnalysisState = "idle" | "loading" | "ready" | "pending" | "error";
type CompatibilityState =
  | {
    status: "checking";
    message: string;
    backendInfo: null;
  }
  | {
    status: "compatible" | "mismatch" | "unavailable";
    message: string;
    backendInfo: BackendVersionResponse | null;
  };

const DEFAULT_PROCESSING = {
  processing_progress: 0,
  processing_stage: "idle",
  processing_eta_seconds: null,
  processing_message: "Aguardando processamento.",
};

const DEFAULT_AI_CONFIG = {
  task_type: "object_detection",
  task_label: "Deteccao de Objetos",
  model_path: "",
  model_relative_path: "",
  model_name: "Modelo nao informado",
  frame_stride: 8,
  confidence_threshold: 0.35,
  max_frames: 300,
  clip_start_sec: 0,
  clip_end_sec: null,
};

function normalizeVideoRecord(video: Partial<VideoRecord>): VideoRecord {
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

function normalizeAnalysisResponse(response: VideoAnalysisResponse | null): VideoAnalysisResponse | null {
  if (!response) {
    return null;
  }

  return {
    ...response,
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

function prettifyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function buildAnalysisMessage(
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

function chooseFirstModel(models: AIModelOption[], taskType: string) {
  return models.find((model) => model.task_type === taskType)?.relative_path ?? "";
}

function choosePreferredTask(tasks: AITaskOption[]) {
  return tasks.find((task) => task.task_type === "object_detection")?.task_type ?? tasks[0]?.task_type ?? "object_detection";
}

function choosePreferredVideo(videos: VideoRecord[]) {
  return videos.find((video) => video.storage.video_exists) ?? videos[0] ?? null;
}

function buildArtifactSignature(video: VideoRecord | null) {
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
  ].join("|");
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  return axiosError.response?.data?.error ?? axiosError.response?.data?.message ?? fallback;
}

export default function VideoDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [tasks, setTasks] = useState<AITaskOption[]>([]);
  const [models, setModels] = useState<AIModelOption[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<VideoAnalysisResponse | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysisDraft, setAnalysisDraft] = useState("{}");
  const [transcription, setTranscription] = useState<VideoTranscriptionResponse | null>(null);
  const [transcriptionDraft, setTranscriptionDraft] = useState("");
  const [transcriptionMessage, setTranscriptionMessage] = useState(
    "Use este campo para revisar, corrigir ou escrever a transcricao manualmente.",
  );
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState("");
  const [uploadTask, setUploadTask] = useState("object_detection");
  const [uploadModelPath, setUploadModelPath] = useState("");
  const [uploadFrameStride, setUploadFrameStride] = useState("8");
  const [uploadConfidenceThreshold, setUploadConfidenceThreshold] = useState("0.35");
  const [uploadMaxFrames, setUploadMaxFrames] = useState("300");
  const [uploadClipStart, setUploadClipStart] = useState("0");
  const [uploadClipEnd, setUploadClipEnd] = useState("");
  const [videoTask, setVideoTask] = useState("object_detection");
  const [videoModelPath, setVideoModelPath] = useState("");
  const [videoFrameStride, setVideoFrameStride] = useState("8");
  const [videoConfidenceThreshold, setVideoConfidenceThreshold] = useState("0.35");
  const [videoMaxFrames, setVideoMaxFrames] = useState("300");
  const [videoClipStart, setVideoClipStart] = useState("0");
  const [videoClipEnd, setVideoClipEnd] = useState("");
  const [compatibility, setCompatibility] = useState<CompatibilityState>({
    status: "checking",
    message: "Verificando compatibilidade entre frontend e backend.",
    backendInfo: null,
  });
  const initializedRef = useRef(false);
  const lastArtifactSignatureRef = useRef("");

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [videos, selectedVideoId],
  );
  const selectedVideoIsBusy = selectedVideo?.status.startsWith("PROCESSANDO") ?? false;

  const stats = useMemo(() => {
    const total = videos.length;
    const processing = videos.filter((video) => video.status.startsWith("PROCESSANDO")).length;
    const processed = videos.filter((video) => video.status === "PROCESSADO").length;
    const errors = videos.filter((video) => video.status.startsWith("ERRO")).length;
    return { total, processing, processed, errors };
  }, [videos]);

  const checkBackendCompatibility = useCallback(async () => {
    setCompatibility({
      status: "checking",
      message: "Verificando compatibilidade entre frontend e backend.",
      backendInfo: null,
    });

    try {
      const response = await api.get<BackendVersionResponse>("/system/version");
      const backendInfo = response.data;

      if (backendInfo.api_contract_version !== frontendApiContractVersion) {
        setCompatibility({
          status: "mismatch",
          backendInfo,
          message:
            "Frontend e backend estao em versoes de contrato diferentes. Reinicie o backend atualizado antes de continuar.",
        });
        return false;
      }

      setCompatibility({
        status: "compatible",
        backendInfo,
        message: `Contrato ${backendInfo.api_contract_version} validado com sucesso.`,
      });
      return true;
    } catch (error) {
      console.error(error);
      setCompatibility({
        status: "unavailable",
        backendInfo: null,
        message:
          "Nao foi possivel validar a versao do backend. Confira se o servidor foi reiniciado com a versao mais recente.",
      });
      return false;
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    try {
      const response = await api.get<ModelCatalogResponse>("/ai/models");
      setTasks(response.data.tasks);
      setModels(response.data.models);

      const defaultTask = choosePreferredTask(response.data.tasks);
      setUploadTask(defaultTask);
      setUploadModelPath(chooseFirstModel(response.data.models, defaultTask));
    } catch (error) {
      console.error(error);
      setHint("Nao foi possivel carregar o catalogo de modelos.");
    }
  }, []);

  const fetchVideos = useCallback(async (options?: { preserveHint?: boolean; silent?: boolean }) => {
    const preserveHint = options?.preserveHint ?? true;
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoadingVideos(true);
    }
    try {
      const response = await api.get<VideoRecord[]>("/videos");
      const normalizedVideos = response.data.map((video) => normalizeVideoRecord(video));
      setVideos(normalizedVideos);
      setSelectedVideoId((current) => {
        if (normalizedVideos.length === 0) {
          return null;
        }
        if (current && normalizedVideos.some((video) => video.id === current)) {
          return current;
        }
        return choosePreferredVideo(normalizedVideos)?.id ?? normalizedVideos[0].id;
      });

      if (!preserveHint) {
        setHint(`Biblioteca atualizada com ${normalizedVideos.length} video(s).`);
      }
    } catch (error) {
      console.error(error);
      setHint("Nao foi possivel atualizar a biblioteca.");
    } finally {
      if (!silent) {
        setLoadingVideos(false);
      }
    }
  }, []);

  const fetchTranscription = useCallback(async (video: VideoRecord) => {
    try {
      const response = await api.get<VideoTranscriptionResponse>(video.transcription_url, {
        validateStatus: (status) => status === 200 || status === 202 || status === 404,
      });

      setTranscription(response.data);
      setTranscriptionDraft(response.data.transcription.content ?? "");

      if (response.status === 200) {
        if (response.data.transcription.status === "unavailable") {
          setTranscriptionMessage(
            response.data.transcription.error ??
            "A transcricao automatica nao esta disponivel neste ambiente ainda.",
          );
        } else {
          setTranscriptionMessage(
            `Transcricao carregada de ${response.data.storage.transcription_relative_path}.`,
          );
        }
        return;
      }

      if (response.status === 202) {
        setTranscriptionMessage(
          response.data.transcription.error ??
          "A transcricao ainda esta em processamento e sera atualizada em breve.",
        );
        return;
      }

      setTranscriptionMessage(
        response.data.transcription.error ??
        "Ainda nao existe transcricao salva. Voce pode criar uma manualmente aqui.",
      );
    } catch (error) {
      console.error(error);
      setTranscriptionMessage("Nao foi possivel carregar a transcricao.");
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    const bootstrap = async () => {
      const compatible = await checkBackendCompatibility();
      if (!compatible) {
        return;
      }
      await Promise.all([fetchCatalog(), fetchVideos({ preserveHint: false })]);
    };
    void bootstrap();
  }, [checkBackendCompatibility, fetchCatalog, fetchVideos]);

  useEffect(() => {
    if (compatibility.status !== "compatible") {
      return;
    }

    const hasRunningAnalysis = videos.some((video) => video.status.startsWith("PROCESSANDO"));
    if (!hasRunningAnalysis) {
      return;
    }

    // Poll only while something is still being processed so the UI updates
    // itself without forcing the user to refresh manually.
    const timer = window.setInterval(() => {
      void fetchVideos({ silent: true });
    }, 7000);

    return () => window.clearInterval(timer);
  }, [compatibility.status, videos, fetchVideos]);

  useEffect(() => {
    if (!selectedVideo) {
      setAnalysis(null);
      setAnalysisState("idle");
      setAnalysisDraft("{}");
      setTranscription(null);
      setTranscriptionDraft("");
      lastArtifactSignatureRef.current = "";
      return;
    }

    setVideoTask(selectedVideo.ai_config.task_type);
    setVideoModelPath(selectedVideo.ai_config.model_relative_path);
    setVideoFrameStride(String(selectedVideo.ai_config.frame_stride ?? 8));
    setVideoConfidenceThreshold(String(selectedVideo.ai_config.confidence_threshold ?? 0.35));
    setVideoMaxFrames(String(selectedVideo.ai_config.max_frames ?? 300));
    setVideoClipStart(String(selectedVideo.ai_config.clip_start_sec ?? 0));
    setVideoClipEnd(
      selectedVideo.ai_config.clip_end_sec === null ? "" : String(selectedVideo.ai_config.clip_end_sec),
    );

    const currentSignature = buildArtifactSignature(selectedVideo);
    if (lastArtifactSignatureRef.current === currentSignature) {
      return;
    }
    lastArtifactSignatureRef.current = currentSignature;

    let cancelled = false;

    const fetchArtifacts = async () => {
      setAnalysisState("loading");

      try {
        // Analysis and transcription are loaded independently so a missing
        // transcription never blocks the video preview or the JSON editor.
        const response = await api.get<VideoAnalysisResponse>(selectedVideo.analysis_url, {
          validateStatus: (status) => status === 200 || status === 202 || status === 404,
        });

        if (cancelled) {
          return;
        }

        const normalizedAnalysis = normalizeAnalysisResponse(response.data);
        setAnalysis(normalizedAnalysis);
        setAnalysisDraft(prettifyJson(normalizedAnalysis?.analysis ?? {}));
        setAnalysisState(response.status === 200 ? "ready" : response.status === 202 ? "pending" : "error");
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setAnalysis(null);
          setAnalysisDraft("{}");
          setAnalysisState("error");
        }
      }

      if (!cancelled) {
        await fetchTranscription(selectedVideo);
      }
    };

    void fetchArtifacts();

    return () => {
      cancelled = true;
    };
  }, [selectedVideo]);

  const handleUploadTaskChange = useCallback((taskType: string) => {
    setUploadTask(taskType);
    setUploadModelPath(chooseFirstModel(models, taskType));
  }, [models]);

  const handleVideoTaskChange = useCallback((taskType: string) => {
    setVideoTask(taskType);
    setVideoModelPath(chooseFirstModel(models, taskType));
  }, [models]);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setMessage("Selecione um arquivo antes de enviar.");
      setHint("");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("ai_task", uploadTask);
    formData.append("model_path", uploadModelPath);
    formData.append("frame_stride", uploadFrameStride || "8");
    formData.append("confidence_threshold", uploadConfidenceThreshold || "0.35");
    formData.append("max_frames", uploadMaxFrames || "300");
    formData.append("clip_start_sec", uploadClipStart || "0");
    if (uploadClipEnd.trim()) {
      formData.append("clip_end_sec", uploadClipEnd.trim());
    }

    setUploading(true);
    try {
      const response = await api.post<UploadResponse>("/videos", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage(response.data.message);
      setHint(
        `Video salvo em ${response.data.next_steps.video_saved_in}. Analise em ${response.data.next_steps.analysis_will_be_saved_in}, video anotado em ${response.data.next_steps.annotated_will_be_saved_in} e transcricao em ${response.data.next_steps.transcription_will_be_saved_in}.`,
      );
      setFile(null);
      setUploadFrameStride("8");
      setUploadConfidenceThreshold("0.35");
      setUploadMaxFrames("300");
      setUploadClipStart("0");
      setUploadClipEnd("");
      await fetchVideos();
      setSelectedVideoId(response.data.video.id);
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Erro ao enviar o video."));
      setHint("Confira a combinacao entre tarefa e modelo e tente novamente.");
    } finally {
      setUploading(false);
    }
  }, [
    file,
    uploadTask,
    uploadModelPath,
    uploadFrameStride,
    uploadConfidenceThreshold,
    uploadMaxFrames,
    uploadClipStart,
    uploadClipEnd,
    fetchVideos,
  ]);

  const handleSaveConfig = useCallback(async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      await api.put(`/videos/${selectedVideo.id}/ai-config`, {
        task_type: videoTask,
        model_path: videoModelPath,
        frame_stride: videoFrameStride,
        confidence_threshold: videoConfidenceThreshold,
        max_frames: videoMaxFrames,
        clip_start_sec: videoClipStart,
        clip_end_sec: videoClipEnd.trim() ? videoClipEnd : null,
      });
      setMessage("Configuracao de IA salva para o video selecionado.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Nao foi possivel salvar a configuracao de IA."));
    }
  }, [
    selectedVideo,
    videoTask,
    videoModelPath,
    videoFrameStride,
    videoConfidenceThreshold,
    videoMaxFrames,
    videoClipStart,
    videoClipEnd,
    fetchVideos,
  ]);

  const handleReprocess = useCallback(async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      await api.post(`/videos/${selectedVideo.id}/reprocess`, {
        task_type: videoTask,
        model_path: videoModelPath,
        frame_stride: videoFrameStride,
        confidence_threshold: videoConfidenceThreshold,
        max_frames: videoMaxFrames,
        clip_start_sec: videoClipStart,
        clip_end_sec: videoClipEnd.trim() ? videoClipEnd : null,
      });
      setMessage("Reprocessamento iniciado.");
      setHint("O video sera analisado novamente com a configuracao escolhida.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Nao foi possivel iniciar o reprocessamento."));
    }
  }, [
    selectedVideo,
    videoTask,
    videoModelPath,
    videoFrameStride,
    videoConfidenceThreshold,
    videoMaxFrames,
    videoClipStart,
    videoClipEnd,
    fetchVideos,
  ]);

  const handleSaveAnalysis = useCallback(async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      const parsed = JSON.parse(analysisDraft);
      await api.put(`/videos/${selectedVideo.id}/analysis`, {
        analysis: parsed,
      });
      setAnalysis({
        video_id: selectedVideo.id,
        filename: selectedVideo.filename,
        status: selectedVideo.status,
        ai_config: selectedVideo.ai_config,
        storage: selectedVideo.storage,
        analysis: parsed,
      });
      setAnalysisDraft(prettifyJson(parsed));
      setAnalysisState("ready");
      setMessage("Analise salva com sucesso.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "JSON invalido ou erro ao salvar a analise."));
    }
  }, [selectedVideo, analysisDraft, fetchVideos]);

  const handleDeleteAnalysis = useCallback(async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      await api.delete(`/videos/${selectedVideo.id}/analysis`);
      setAnalysis(null);
      setAnalysisDraft("{}");
      setAnalysisState("error");
      setMessage("Analise excluida.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir a analise."));
    }
  }, [selectedVideo, fetchVideos]);

  const handleDeleteVideo = useCallback(async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      await api.delete(`/videos/${selectedVideo.id}`);
      setMessage("Video removido com sucesso.");
      setHint("O arquivo enviado e os artefatos associados foram removidos.");
      setAnalysis(null);
      setAnalysisDraft("{}");
      setTranscriptionDraft("");
      setTranscription(null);
      lastArtifactSignatureRef.current = "";
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir o video."));
    }
  }, [selectedVideo, fetchVideos]);

  const handleSaveTranscription = useCallback(async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      await api.put(`/videos/${selectedVideo.id}/transcription`, {
        content: transcriptionDraft,
        source: "manual",
      });
      setMessage("Transcricao salva com sucesso.");
      await fetchVideos();
      await fetchTranscription(selectedVideo);
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Nao foi possivel salvar a transcricao."));
    }
  }, [selectedVideo, transcriptionDraft, fetchVideos, fetchTranscription]);

  const handleDeleteTranscription = useCallback(async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      await api.delete(`/videos/${selectedVideo.id}/transcription`);
      setTranscription(null);
      setTranscriptionDraft("");
      setTranscriptionMessage("Transcricao removida. Voce pode criar uma nova quando quiser.");
      setMessage("Transcricao excluida.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir a transcricao."));
    }
  }, [selectedVideo, fetchVideos]);

  const handleGenerateTranscription = useCallback(async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      setTranscriptionMessage("Gerando transcricao automatica. Isso pode levar alguns instantes.");
      const response = await api.post<{
        message: string;
        transcription: VideoTranscriptionResponse["transcription"];
      }>(`/videos/${selectedVideo.id}/transcription/generate`, {});
      setMessage(response.data.message);
      await fetchVideos();
      await fetchTranscription(selectedVideo);
    } catch (error) {
      console.error(error);
      setMessage(
        getApiErrorMessage(
          error,
          "Nao foi possivel gerar a transcricao automatica. Verifique o Whisper e o ffmpeg.",
        ),
      );
    }
  }, [selectedVideo, fetchVideos, fetchTranscription]);

  const handleRetryCompatibility = useCallback(async () => {
    const compatible = await checkBackendCompatibility();
    if (!compatible) {
      return;
    }
    await Promise.all([fetchCatalog(), fetchVideos({ preserveHint: false })]);
  }, [checkBackendCompatibility, fetchCatalog, fetchVideos]);

  if (compatibility.status !== "compatible") {
    return (
      <div className="workspace">
        <section className={`surface compatibility-banner is-${compatibility.status}`}>
          <div>
            <span className="eyebrow">Compatibilidade</span>
            <h2>
              {compatibility.status === "checking"
                ? "Validando versoes do sistema"
                : "Atualizacao necessaria antes de usar o painel"}
            </h2>
            <p>{compatibility.message}</p>
            <p className="compatibility-meta">
              Frontend {frontendAppVersion} · contrato {frontendApiContractVersion}
              {compatibility.backendInfo
                ? ` · backend ${compatibility.backendInfo.backend_app_version} · contrato ${compatibility.backendInfo.api_contract_version}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => void handleRetryCompatibility()}
            disabled={compatibility.status === "checking"}
          >
            {compatibility.status === "checking" ? "Verificando..." : "Tentar novamente"}
          </button>
        </section>
      </div>
    );
  }

  const globalProcessState = uploading
    ? { text: "Upload em andamento", progress: null }
    : loadingVideos
      ? { text: "Atualizando biblioteca", progress: null }
      : selectedVideoIsBusy && selectedVideo
        ? { text: `Processando video: ${selectedVideo.filename}`, progress: selectedVideo.processing.processing_progress }
        : null;

  const globalProgressValue = globalProcessState?.progress ?? 0;

  return (
    <div className="workspace">
      {globalProcessState && (
        <section className="surface site-progress-panel">
          <div className="site-progress-title">
            <strong>{globalProcessState.text}</strong>
            <span>{globalProgressValue ? `${globalProgressValue}%` : "..."}</span>
          </div>
          <div className="site-progress-bar" aria-hidden="true">
            <span style={{ width: `${globalProgressValue}%` }} />
          </div>
        </section>
      )}

      <UploadComposerPanel
        file={file}
        message={message}
        hint={hint}
        uploading={uploading}
        selectedTask={uploadTask}
        selectedModelPath={uploadModelPath}
        frameStride={uploadFrameStride}
        confidenceThreshold={uploadConfidenceThreshold}
        maxFrames={uploadMaxFrames}
        clipStart={uploadClipStart}
        clipEnd={uploadClipEnd}
        tasks={tasks}
        models={models}
        onFileChange={setFile}
        onTaskChange={handleUploadTaskChange}
        onModelChange={setUploadModelPath}
        onFrameStrideChange={setUploadFrameStride}
        onConfidenceThresholdChange={setUploadConfidenceThreshold}
        onMaxFramesChange={setUploadMaxFrames}
        onClipStartChange={setUploadClipStart}
        onClipEndChange={setUploadClipEnd}
        onUpload={handleUpload}
        onRefresh={() => void fetchVideos({ preserveHint: false })}
      />

      <section className="stats-row">
        <article className="surface stat-panel">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="surface stat-panel">
          <span>Em processamento</span>
          <strong>{stats.processing}</strong>
        </article>
        <article className="surface stat-panel">
          <span>Concluidos</span>
          <strong>{stats.processed}</strong>
        </article>
        <article className="surface stat-panel">
          <span>Com erro</span>
          <strong>{stats.errors}</strong>
        </article>
      </section>

      <section className="content-grid">
        <VideoLibrary
          videos={videos}
          selectedVideoId={selectedVideoId}
          loading={loadingVideos}
          onSelect={setSelectedVideoId}
        />

        <VideoWorkbench
          video={selectedVideo}
          analysis={analysis}
          analysisState={analysisState}
          analysisMessage={buildAnalysisMessage(analysisState, selectedVideo, analysis)}
          selectedTask={videoTask}
          selectedModelPath={videoModelPath}
          selectedFrameStride={videoFrameStride}
          selectedConfidenceThreshold={videoConfidenceThreshold}
          selectedMaxFrames={videoMaxFrames}
          selectedClipStart={videoClipStart}
          selectedClipEnd={videoClipEnd}
          taskOptions={tasks}
          modelOptions={models}
          analysisDraft={analysisDraft}
          transcription={transcription}
          transcriptionDraft={transcriptionDraft}
          transcriptionMessage={transcriptionMessage}
          isBusy={selectedVideoIsBusy}
          onTaskChange={handleVideoTaskChange}
          onModelChange={setVideoModelPath}
          onFrameStrideChange={setVideoFrameStride}
          onConfidenceThresholdChange={setVideoConfidenceThreshold}
          onMaxFramesChange={setVideoMaxFrames}
          onClipStartChange={setVideoClipStart}
          onClipEndChange={setVideoClipEnd}
          onAnalysisDraftChange={setAnalysisDraft}
          onTranscriptionDraftChange={setTranscriptionDraft}
          onSaveConfig={handleSaveConfig}
          onReprocess={handleReprocess}
          onDeleteVideo={handleDeleteVideo}
          onSaveAnalysis={handleSaveAnalysis}
          onDeleteAnalysis={handleDeleteAnalysis}
          onGenerateTranscription={handleGenerateTranscription}
          onSaveTranscription={handleSaveTranscription}
          onDeleteTranscription={handleDeleteTranscription}
        />
      </section>
    </div>
  );
}
