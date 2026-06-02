import type { VideoRecord } from "../types";
import "../styles/ProcessingQueuePanel.css";

interface ProcessingQueuePanelProps {
  videos: VideoRecord[];
}

export function ProcessingQueuePanel({ videos }: ProcessingQueuePanelProps) {
  const processingVideos = videos.filter(
    (v) => v.status === "PROCESSANDO" || v.status === "PROCESSANDO_IA"
  );

  if (processingVideos.length === 0) {
    return (
      <div className="processing-queue-panel">
        <div className="panel-header">
          <h3>Fila de Processamento</h3>
        </div>
        <div className="empty-state">
          <span className="empty-icon">✓</span>
          <p>Nenhum vídeo em processamento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="processing-queue-panel">
      <div className="panel-header">
        <h3>Fila de Processamento</h3>
        <span className="queue-count">{processingVideos.length}</span>
      </div>

      <div className="queue-list">
        {processingVideos.map((video) => (
          <div key={video.id} className="queue-item">
            {/* Video Info */}
            <div className="queue-info">
              <div className="video-name" title={video.filename}>
                {video.filename}
              </div>
              <div className="video-meta">
                <span className="task-badge">{video.ai_config.task_label}</span>
                <span className="model-badge">{video.ai_config.model_name}</span>
              </div>
            </div>

            {/* Progress */}
            <div className="queue-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${video.processing.processing_progress}%` }}
                  role="progressbar"
                  aria-valuenow={video.processing.processing_progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>

              <div className="progress-info">
                <span className="progress-percent">
                  {video.processing.processing_progress}%
                </span>
                {video.processing.processing_eta_seconds !== null && (
                  <span className="progress-eta">
                    ~{video.processing.processing_eta_seconds}s
                  </span>
                )}
              </div>

              {/* Stage Indicator */}
              <div className="progress-stage">
                {video.processing.processing_message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
