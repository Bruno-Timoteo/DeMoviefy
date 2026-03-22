import { StatusBadge } from "./StatusBadge";
import type { VideoAnalysisResponse, VideoRecord } from "../types";
import { toApiUrl } from "../../../services/api";

type VideoInspectorProps = {
  video: VideoRecord | null;
  analysis: VideoAnalysisResponse | null;
  analysisState: "idle" | "loading" | "ready" | "pending" | "error";
  analysisMessage: string;
};

function formatPercent(value: number | undefined) {
  if (typeof value !== "number") {
    return "-";
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function VideoInspector({
  video,
  analysis,
  analysisState,
  analysisMessage,
}: VideoInspectorProps) {
  if (!video) {
    return (
      <section className="surface inspector-panel empty-state">
        <strong>Selecione um video para inspecionar.</strong>
        <p>Aqui vao aparecer preview, caminhos dos arquivos e o resumo da analise.</p>
      </section>
    );
  }

  const summary = analysis?.analysis ?? null;

  return (
    <section className="surface inspector-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Inspector</span>
          <h2>{video.filename}</h2>
        </div>
        <StatusBadge status={video.status} />
      </div>

      <div className="inspector-grid">
        <div className="media-panel">
          <video className="video-preview" controls preload="metadata" src={toApiUrl(video.video_url)}>
            Seu navegador nao suporta reproduzir este video.
          </video>

          <div className="info-grid">
            <div className="info-card">
              <span>Video salvo em</span>
              <strong>{video.storage.video_relative_path}</strong>
              <small>{video.storage.video_absolute_path}</small>
            </div>
            <div className="info-card">
              <span>Resumo salvo em</span>
              <strong>{video.storage.analysis_relative_path}</strong>
              <small>{video.storage.analysis_absolute_path}</small>
            </div>
          </div>
        </div>

        <div className="analysis-panel">
          <div className="analysis-state">
            <span className="eyebrow">Resumo</span>
            <p>{analysisMessage}</p>
          </div>

          {analysisState === "loading" && <div className="skeleton-block" />}

          {summary && (
            <>
              <div className="analysis-metrics">
                <div className="metric-card">
                  <span>Deteccoes</span>
                  <strong>{summary.total_detections}</strong>
                </div>
                <div className="metric-card">
                  <span>Frames amostrados</span>
                  <strong>{summary.sampled_frames}</strong>
                </div>
                <div className="metric-card">
                  <span>Modelo</span>
                  <strong title={summary.model_path}>{summary.model_path.split(/[\\/]/).pop()}</strong>
                </div>
              </div>

              <div className="label-table">
                <div className="label-table-header">
                  <span>Classe</span>
                  <span>Ocorrencias</span>
                  <span>Confianca media</span>
                </div>
                {Object.keys(summary.label_counts).length === 0 && (
                  <div className="label-table-row muted-row">
                    <span>Nenhuma deteccao encontrada</span>
                    <span>0</span>
                    <span>-</span>
                  </div>
                )}
                {Object.entries(summary.label_counts).map(([label, count]) => (
                  <div key={label} className="label-table-row">
                    <span>{label}</span>
                    <span>{count}</span>
                    <span>{formatPercent(summary.avg_confidence_by_label[label])}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
