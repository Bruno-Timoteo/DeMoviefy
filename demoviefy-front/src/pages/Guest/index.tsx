import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AxiosError } from "axios";

import { useAuth } from "../../features/auth/AuthContext";
import { ProcessingQueuePanel } from "../../features/videos/components/ProcessingQueuePanel";
import { StatusBadge } from "../../features/videos/components/StatusBadge";
import type {
  VideoAnalysisResponse,
  VideoRecord,
} from "../../features/videos/types";
import { api, toApiUrlWithQuery } from "../../services/api";

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

function formatDuration(seconds: number | null | undefined) {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return "?";
  }

  if (seconds >= 60) {
    return `${Math.round(seconds / 60)} min`;
  }

  return `${seconds.toFixed(1)} s`;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  return axiosError.response?.data?.error ?? axiosError.response?.data?.message ?? fallback;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M8 6.5v11l9-5.5-9-5.5Z" />
    </svg>
  );
}

function GuestMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="surface flex min-h-[110px] flex-col justify-between rounded-[28px] px-5 py-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{label}</span>
      <strong className="text-4xl font-semibold tracking-tight text-[var(--text)]">{value}</strong>
    </article>
  );
}

export default function GuestPage() {
  const { isAdmin } = useAuth();
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [analysis, setAnalysis] = useState<VideoAnalysisResponse | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState("Escolha um video para abrir o resumo principal.");
  const [error, setError] = useState("");

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [selectedVideoId, videos],
  );

  const filteredVideos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return videos;
    }
    return videos.filter((video) => video.filename.toLowerCase().includes(term));
  }, [search, videos]);

  const fetchVideos = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await api.get<VideoRecord[]>("/videos");
      const normalizedVideos = response.data.map((video) => normalizeVideoRecord(video));
      startTransition(() => {
        setVideos(normalizedVideos);
        setSelectedVideoId((current) => {
          if (normalizedVideos.length === 0) {
            return null;
          }

          if (current && normalizedVideos.some((video) => video.id === current)) {
            return current;
          }

          return normalizedVideos[0].id;
        });
      });
      setError("");
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Nao foi possivel carregar a biblioteca."));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    const hasRunningItems = videos.some((video) => video.status.startsWith("PROCESSANDO"));
    if (!hasRunningItems) {
      return;
    }

    const timer = window.setInterval(() => {
      void fetchVideos(true);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [fetchVideos, videos]);

  useEffect(() => {
    if (!selectedVideo) {
      setAnalysis(null);
      setAnalysisMessage("Escolha um video para abrir o resumo principal.");
      return;
    }

    let cancelled = false;

    const fetchAnalysis = async () => {
      try {
        const response = await api.get<VideoAnalysisResponse>(selectedVideo.analysis_url, {
          validateStatus: (status) => status === 200 || status === 202 || status === 404,
        });

        if (cancelled) {
          return;
        }

        if (response.status === 200) {
          setAnalysis(response.data);
          setAnalysisMessage(response.data.message ?? "Resumo carregado.");
          return;
        }

        setAnalysis(null);
        setAnalysisMessage(
          response.data.message ??
            (response.status === 202
              ? "O resumo ainda esta em processamento."
              : "Este video ainda nao possui resumo salvo."),
        );
      } catch {
        if (!cancelled) {
          setAnalysis(null);
          setAnalysisMessage("Nao foi possivel carregar o resumo desse video.");
        }
      }
    };

    void fetchAnalysis();

    return () => {
      cancelled = true;
    };
  }, [selectedVideo]);

  const previewSrc = selectedVideo
    ? toApiUrlWithQuery(
        selectedVideo.storage.annotated_exists ? selectedVideo.annotated_url : selectedVideo.video_url,
        {
          v: selectedVideo.created_at ?? selectedVideo.id,
          status: selectedVideo.status,
        },
      )
    : "";

  const summary = analysis?.analysis;

  return (
    <div className="workspace">
      <section className="surface rounded-[32px] px-6 py-5">
        <span className="eyebrow">Comece a Usar</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">Modo sem login</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted)]">
          Este acesso serve para explorar o produto e acompanhar a interface. Historico persistente, controles
          administrativos, configuracoes sensiveis e laboratorio de testes ficam restritos a administradores.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={isAdmin ? "/admin/lab" : "/login"} className="primary-button no-underline">
            {isAdmin ? "Ir para o laboratorio admin" : "Entrar como admin"}
          </Link>
          <Link to="/" className="ghost-button no-underline">
            Voltar para a homepage
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="surface flex max-h-[calc(100vh-170px)] flex-col rounded-[32px] px-4 py-4">
          <div className="rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2">
            <input
              className="w-full border-0 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              placeholder="Pesquise pelo titulo do video..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              {filteredVideos.map((video) => {
                const isSelected = selectedVideoId === video.id;
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setSelectedVideoId(video.id)}
                    className={`flex w-full gap-3 rounded-[24px] border p-2 text-left transition ${
                      isSelected
                        ? "border-blue-500/25 bg-[var(--brand-soft)]"
                        : "border-[var(--border)] bg-[var(--surface-strong)]"
                    }`}
                    style={{ contentVisibility: "auto", containIntrinsicSize: "148px" }}
                  >
                    <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-[18px] bg-slate-950">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900/80" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                          <PlayIcon />
                        </span>
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[22px] font-semibold leading-none text-[var(--text)]">
                        {video.filename}
                      </p>
                      <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
                        Descricao do video e resumo rapido do estado atual do processamento.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                        <span>
                          Tempo: {summary && selectedVideoId === video.id ? formatDuration(summary.video_duration_sec) : "?"}
                        </span>
                        <span>|</span>
                        <StatusBadge status={video.status} processing={video.processing} compact />
                      </div>
                    </div>
                  </button>
                );
              })}

              {!filteredVideos.length && (
                <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-strong)] px-4 py-6 text-sm text-[var(--muted)]">
                  Nenhum video encontrado para a pesquisa atual.
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <GuestMetric label="Resumo" value={summary ? String(summary.total_detections) : "?"} />
            <GuestMetric label="Frames" value={summary ? String(summary.sampled_frames) : "?"} />
            <GuestMetric label="Transcricao" value={selectedVideo?.transcription_ready ? "OK" : "?"} />
          </div>

          <section className="surface rounded-[32px] px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="eyebrow">Exploracao</span>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
                  {selectedVideo?.filename ?? "Selecione um item da biblioteca"}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{analysisMessage}</p>
              </div>
              {selectedVideo && <StatusBadge status={selectedVideo.status} processing={selectedVideo.processing} />}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_340px]">
              <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)]">
                {selectedVideo ? (
                  <video className="video-preview min-h-[360px]" controls preload="metadata" src={previewSrc}>
                    Seu navegador nao suporta reproduzir este video.
                  </video>
                ) : (
                  <div className="empty-preview min-h-[360px]">
                    <strong>Abra um video pela biblioteca.</strong>
                    <p>O player e o resumo principal aparecem aqui.</p>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                <Link
                  to={isAdmin ? "/admin/lab" : "/login"}
                  className="flex min-h-[76px] items-center justify-center rounded-[28px] bg-[var(--brand)] px-5 text-2xl font-semibold text-white no-underline shadow-[0_18px_34px_rgba(37,99,235,0.24)]"
                >
                  {isAdmin ? "+ Novo video" : "Entrar para processar"}
                </Link>

                <ProcessingQueuePanel
                  videos={videos}
                  selectedVideoId={selectedVideoId}
                  onSelect={setSelectedVideoId}
                />
              </div>
            </div>
          </section>
        </section>
      </section>

      {error && (
        <p className="rounded-[20px] bg-[rgba(248,113,113,0.14)] px-4 py-3 text-sm text-[var(--text)]">{error}</p>
      )}

      {loading && (
        <p className="rounded-[20px] bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--text)]">
          Atualizando a biblioteca principal...
        </p>
      )}
    </div>
  );
}
