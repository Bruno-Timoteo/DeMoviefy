import { useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";

import { api } from "../../services/api";
import { UploadComposerPanel } from "./components/UploadComposerPanel";
import { VideoLibrary } from "./components/VideoLibrary";
import { VideoWorkbench } from "./components/VideoWorkbench";
import type {
  AIModelOption,
  AITaskOption,
  ModelCatalogResponse,
  UploadResponse,
  VideoAnalysisResponse,
  VideoRecord,
  VideoTranscriptionResponse,
} from "./types";

type AnalysisState = "idle" | "loading" | "ready" | "pending" | "error";

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
    return "O video foi salvo e o backend ainda esta executando a analise.";
  }

  if (state === "error") {
    return "Nao foi possivel carregar a analise agora. Voce ainda pode editar ou recriar o JSON.";
  }

  if (!analysis) {
    return "Este video ainda nao possui resumo salvo.";
  }

  return `Analise carregada de ${analysis.storage.analysis_relative_path}.`;
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
  const [videoTask, setVideoTask] = useState("object_detection");
  const [videoModelPath, setVideoModelPath] = useState("");

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [videos, selectedVideoId],
  );

  const stats = useMemo(() => {
    const total = videos.length;
    const processing = videos.filter((video) => video.status.startsWith("PROCESSANDO")).length;
    const processed = videos.filter((video) => video.status === "PROCESSADO").length;
    const errors = videos.filter((video) => video.status.startsWith("ERRO")).length;
    return { total, processing, processed, errors };
  }, [videos]);

  const fetchCatalog = async () => {
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
  };

  const fetchVideos = async (preserveHint = true) => {
    setLoadingVideos(true);
    try {
      const response = await api.get<VideoRecord[]>("/videos");
      setVideos(response.data);
      setSelectedVideoId((current) => {
        if (response.data.length === 0) {
          return null;
        }
        if (current && response.data.some((video) => video.id === current)) {
          return current;
        }
        return choosePreferredVideo(response.data)?.id ?? response.data[0].id;
      });

      if (!preserveHint) {
        setHint(`Biblioteca atualizada com ${response.data.length} video(s).`);
      }
    } catch (error) {
      console.error(error);
      setHint("Nao foi possivel atualizar a biblioteca.");
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchTranscription = async (video: VideoRecord) => {
    try {
      const response = await api.get<VideoTranscriptionResponse>(video.transcription_url, {
        validateStatus: (status) => status === 200 || status === 404,
      });

      if (response.status === 200) {
        setTranscriptionDraft(response.data.transcription.content);
        setTranscriptionMessage(
          `Transcricao carregada de ${response.data.storage.transcription_relative_path}.`,
        );
        return;
      }

      setTranscriptionDraft("");
      setTranscriptionMessage(
        "Ainda nao existe transcricao salva. Voce pode criar uma manualmente aqui.",
      );
    } catch (error) {
      console.error(error);
      setTranscriptionMessage("Nao foi possivel carregar a transcricao.");
    }
  };

  useEffect(() => {
    void fetchCatalog();
    void fetchVideos(false);
  }, []);

  useEffect(() => {
    const hasRunningAnalysis = videos.some((video) => video.status.startsWith("PROCESSANDO"));
    if (!hasRunningAnalysis) {
      return;
    }

    // Poll only while something is still being processed so the UI updates
    // itself without forcing the user to refresh manually.
    const timer = window.setInterval(() => {
      void fetchVideos();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [videos]);

  useEffect(() => {
    if (!selectedVideo) {
      setAnalysis(null);
      setAnalysisState("idle");
      setAnalysisDraft("{}");
      setTranscriptionDraft("");
      return;
    }

    setVideoTask(selectedVideo.ai_config.task_type);
    setVideoModelPath(selectedVideo.ai_config.model_relative_path);

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

        if (response.status === 200) {
          setAnalysis(response.data);
          setAnalysisDraft(prettifyJson(response.data.analysis));
          setAnalysisState("ready");
        } else {
          setAnalysis(null);
          setAnalysisDraft("{}");
          setAnalysisState(response.status === 202 ? "pending" : "error");
        }
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

  const handleUploadTaskChange = (taskType: string) => {
    setUploadTask(taskType);
    setUploadModelPath(chooseFirstModel(models, taskType));
  };

  const handleVideoTaskChange = (taskType: string) => {
    setVideoTask(taskType);
    setVideoModelPath(chooseFirstModel(models, taskType));
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Selecione um arquivo antes de enviar.");
      setHint("");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("ai_task", uploadTask);
    formData.append("model_path", uploadModelPath);

    setUploading(true);
    try {
      const response = await api.post<UploadResponse>("/videos", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage(response.data.message);
      setHint(
        `Video salvo em ${response.data.next_steps.video_saved_in}. Analise em ${response.data.next_steps.analysis_will_be_saved_in} e transcricao em ${response.data.next_steps.transcription_will_be_saved_in}.`,
      );
      setFile(null);
      await fetchVideos();
      setSelectedVideoId(response.data.video.id);
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Erro ao enviar o video."));
      setHint("Confira a combinacao entre tarefa e modelo e tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      await api.put(`/videos/${selectedVideo.id}/ai-config`, {
        task_type: videoTask,
        model_path: videoModelPath,
      });
      setMessage("Configuracao de IA salva para o video selecionado.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Nao foi possivel salvar a configuracao de IA."));
    }
  };

  const handleReprocess = async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      await api.post(`/videos/${selectedVideo.id}/reprocess`, {
        task_type: videoTask,
        model_path: videoModelPath,
      });
      setMessage("Reprocessamento iniciado.");
      setHint("O video sera analisado novamente com a configuracao escolhida.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Nao foi possivel iniciar o reprocessamento."));
    }
  };

  const handleSaveAnalysis = async () => {
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
  };

  const handleDeleteAnalysis = async () => {
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
  };

  const handleSaveTranscription = async () => {
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
  };

  const handleDeleteTranscription = async () => {
    if (!selectedVideo) {
      return;
    }

    try {
      await api.delete(`/videos/${selectedVideo.id}/transcription`);
      setTranscriptionDraft("");
      setTranscriptionMessage("Transcricao removida. Voce pode criar uma nova quando quiser.");
      setMessage("Transcricao excluida.");
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage(getApiErrorMessage(error, "Nao foi possivel excluir a transcricao."));
    }
  };

  return (
    <div className="workspace">
      <UploadComposerPanel
        file={file}
        message={message}
        hint={hint}
        uploading={uploading}
        selectedTask={uploadTask}
        selectedModelPath={uploadModelPath}
        tasks={tasks}
        models={models}
        onFileChange={setFile}
        onTaskChange={handleUploadTaskChange}
        onModelChange={setUploadModelPath}
        onUpload={handleUpload}
        onRefresh={() => void fetchVideos(false)}
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
          taskOptions={tasks}
          modelOptions={models}
          analysisDraft={analysisDraft}
          transcriptionDraft={transcriptionDraft}
          transcriptionMessage={transcriptionMessage}
          onTaskChange={handleVideoTaskChange}
          onModelChange={setVideoModelPath}
          onAnalysisDraftChange={setAnalysisDraft}
          onTranscriptionDraftChange={setTranscriptionDraft}
          onSaveConfig={handleSaveConfig}
          onReprocess={handleReprocess}
          onSaveAnalysis={handleSaveAnalysis}
          onDeleteAnalysis={handleDeleteAnalysis}
          onSaveTranscription={handleSaveTranscription}
          onDeleteTranscription={handleDeleteTranscription}
        />
      </section>
    </div>
  );
}
