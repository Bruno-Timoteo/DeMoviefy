import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { StatusBadge } from "src/core/components/StatusBadge";
import type { VideoRecord } from "src/core/types/videoTypes";

type DashboardVideoLibraryProps = {
  videos: VideoRecord[];
};

const VIDEOS_PER_PAGE = 3;

function formatDate(createdAt: string | null) {
  if (!createdAt) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function formatSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(1)}s`;
}

function getStatusStyles(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (status.startsWith("PROCESSANDO")) {
    return "bg-blue-50 hover:bg-blue-100";
  }

  if (
    normalizedStatus.includes("erro") ||
    normalizedStatus.includes("falha")
  ) {
    return "bg-red-50 hover:bg-red-100";
  }

  if (
    normalizedStatus.includes("concluído") ||
    normalizedStatus.includes("concluido")
  ) {
    return "bg-green-50 hover:bg-green-100";
  }

  if (
    normalizedStatus.includes("aguardando") ||
    normalizedStatus.includes("pendente")
  ) {
    return "bg-amber-50 hover:bg-amber-100";
  }

  return "bg-neutral-50 hover:bg-neutral-100";
}

export const DashboardVideoLibrary = memo(
  function DashboardVideoLibrary({
    videos,
  }: DashboardVideoLibraryProps) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const filteredVideos = useMemo(() => {
      const normalizedSearch = search.trim().toLowerCase();

      if (!normalizedSearch) {
        return videos;
      }

      return videos.filter((video) =>
        video.filename.toLowerCase().includes(normalizedSearch),
      );
    }, [videos, search]);

    const totalPages = Math.max(
      1,
      Math.ceil(filteredVideos.length / VIDEOS_PER_PAGE),
    );

    const visibleVideos = useMemo(() => {
      const startIndex = (page - 1) * VIDEOS_PER_PAGE;

      return filteredVideos.slice(
        startIndex,
        startIndex + VIDEOS_PER_PAGE,
      );
    }, [filteredVideos, page]);

    useEffect(() => {
      setPage(1);
    }, [search]);

    useEffect(() => {
      if (page > totalPages) {
        setPage(totalPages);
      }
    }, [page, totalPages]);

    return (
      <section className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <div className="pb-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Busque pelo nome do vídeo..."
            aria-label="Buscar vídeo"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-blue-400 focus:bg-white"
          />
        </div>

        <div className="min-h-0 flex-1">
          {visibleVideos.length === 0 ? (
            <div className="px-2 py-4">
              <strong className="text-sm font-medium text-neutral-900">
                {search
                  ? "Nenhum vídeo encontrado."
                  : "Nenhum vídeo enviado ainda."}
              </strong>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {search
                  ? "Tente buscar por outro nome de arquivo."
                  : "Assim que o upload terminar, ele aparecerá aqui."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleVideos.map((video) => (
                <Link
                  key={video.id}
                  to={`/video/${video.id}`}
                  className={`group block rounded-lg px-4 py-4 transition ${getStatusStyles(
                    video.status,
                  )}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <strong
                        title={video.filename}
                        className="min-w-0 truncate text-sm font-medium text-neutral-900"
                      >
                        {video.filename}
                      </strong>

                      <StatusBadge status={video.status} />
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                      <span>#{video.id}</span>

                      <span aria-hidden="true">·</span>

                      <span className="truncate">
                        {formatDate(video.created_at)}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-neutral-200/70 pt-3">
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="truncate font-medium text-neutral-700">
                          {video.ai_config.model_name}
                        </span>

                        <span className="shrink-0 text-neutral-500">
                          {video.transcription_ready
                            ? "Com transcrição"
                            : "Sem transcrição"}
                        </span>
                      </div>

                      <div className="mt-1.5 flex justify-between gap-3 text-xs text-neutral-500">
                        <span className="truncate">
                          Trecho:{" "}
                          {formatSeconds(video.ai_config.clip_start_sec)} -{" "}
                          {video.ai_config.clip_end_sec === null
                            ? "fim"
                            : formatSeconds(
                                video.ai_config.clip_end_sec,
                              )}
                        </span>

                        <span className="shrink-0">
                          {video.storage.annotated_exists
                            ? "Preview anotado pronto"
                            : "Preview anotado pendente"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <nav
            aria-label="Paginação da biblioteca"
            className="flex items-center justify-between border-t border-neutral-100 pt-4"
          >
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-md px-2 py-1 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"
            >
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`h-7 min-w-7 rounded-md px-2 text-xs font-medium transition ${
                      pageNumber === page
                        ? "bg-blue-600 text-white"
                        : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-md px-2 py-1 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"
            >
              Próxima
            </button>
          </nav>
        )}
      </section>
    );
  },
);