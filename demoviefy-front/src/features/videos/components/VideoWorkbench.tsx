import { StatusBadge } from "./StatusBadge";
import type { AIModelOption, AITaskOption, VideoAnalysisResponse, VideoRecord } from "../types";
import { toApiUrl } from "../../../services/api";

type VideoWorkbenchProps = {
  video: VideoRecord | null;
  analysis: VideoAnalysisResponse | null;
  analysisState: "idle" | "loading" | "ready" | "pending" | "error";
  analysisMessage: string;
  selectedTask: string;
  selectedModelPath: string;
  taskOptions: AITaskOption[];
  modelOptions: AIModelOption[];
  analysisDraft: string;
  transcriptionDraft: string;
  transcriptionMessage: string;
  onTaskChange: (taskType: string) => void;
  onModelChange: (modelPath: string) => void;
  onAnalysisDraftChange: (value: string) => void;
  onTranscriptionDraftChange: (value: string) => void;
  onSaveConfig: () => void;
  onReprocess: () => void;
  onSaveAnalysis: () => void;
  onDeleteAnalysis: () => void;
  onSaveTranscription: () => void;
  onDeleteTranscription: () => void;
};

function formatPercent(value: number | undefined) {
  if (typeof value !== "number") {
    return "-";
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function VideoWorkbench({
  video,
  analysis,
  analysisState,
  analysisMessage,
  selectedTask,
  selectedModelPath,
  taskOptions,
  modelOptions,
  analysisDraft,
  transcriptionDraft,
  transcriptionMessage,
  onTaskChange,
  onModelChange,
  onAnalysisDraftChange,
  onTranscriptionDraftChange,
  onSaveConfig,
  onReprocess,
  onSaveAnalysis,
  onDeleteAnalysis,
  onSaveTranscription,
  onDeleteTranscription,
}: VideoWorkbenchProps) {
  if (!video) {
    return (
      <section className="surface inspector-panel empty-state">
        <strong>Selecione um video para editar os artefatos.</strong>
        <p>Aqui voce pode rever o preview, trocar o modelo e editar analise ou transcricao.</p>
      </section>
    );
  }

  const summary = analysis?.analysis ?? null;
  const filteredModels = modelOptions.filter((model) => model.task_type === selectedTask);

  return (
    <section className="surface inspector-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Workbench</span>
          <h2>{video.filename}</h2>
        </div>
        <StatusBadge status={video.status} />
      </div>

      <div className="inspector-grid">
        <div className="media-panel">
          {video.storage.video_exists ? (
            <video className="video-preview" controls preload="metadata" src={toApiUrl(video.video_url)}>
              Seu navegador nao suporta reproduzir este video.
            </video>
          ) : (
            <div className="empty-preview">
              <strong>Arquivo de video nao encontrado.</strong>
              <p>O registro ainda existe no banco, mas o arquivo nao esta mais em uploads/.</p>
            </div>
          )}

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
            <div className="info-card">
              <span>Transcricao salva em</span>
              <strong>{video.storage.transcription_relative_path}</strong>
              <small>{video.storage.transcription_absolute_path}</small>
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
                <span>Tarefa</span>
                <strong>{video.ai_config.task_label}</strong>
              </div>
              <div className="metric-card">
                <span>Modelo</span>
                <strong>{video.ai_config.model_name}</strong>
              </div>
            </div>
          )}

          {summary && (
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
          )}

          <div className="editor-grid">
            <section className="editor-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">IA</span>
                  <h3>Configuracao do video</h3>
                </div>
              </div>

              <div className="config-grid">
                <label className="field-block">
                  <span>Tarefa</span>
                  <select value={selectedTask} onChange={(event) => onTaskChange(event.target.value)}>
                    {taskOptions.map((task) => (
                      <option key={task.task_type} value={task.task_type}>
                        {task.task_label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-block">
                  <span>Modelo</span>
                  <select
                    value={selectedModelPath}
                    onChange={(event) => onModelChange(event.target.value)}
                  >
                    {filteredModels.map((model) => (
                      <option key={model.relative_path} value={model.relative_path}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="action-row">
                <button type="button" className="ghost-button" onClick={onSaveConfig}>
                  Salvar configuracao
                </button>
                <button type="button" className="primary-button" onClick={onReprocess}>
                  Reprocessar video
                </button>
              </div>
            </section>

            <section className="editor-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Analise</span>
                  <h3>JSON editavel</h3>
                </div>
              </div>
              <textarea
                className="editor-area"
                value={analysisDraft}
                onChange={(event) => onAnalysisDraftChange(event.target.value)}
                spellCheck={false}
              />
              <div className="action-row">
                <button type="button" className="ghost-button danger-button" onClick={onDeleteAnalysis}>
                  Excluir analise
                </button>
                <button type="button" className="primary-button" onClick={onSaveAnalysis}>
                  Salvar analise
                </button>
              </div>
            </section>

            <section className="editor-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Transcricao</span>
                  <h3>Texto editavel</h3>
                </div>
              </div>
              <textarea
                className="editor-area transcription-area"
                value={transcriptionDraft}
                onChange={(event) => onTranscriptionDraftChange(event.target.value)}
                placeholder="Cole ou escreva aqui a transcricao do video."
              />
              <p className="transcription-note">{transcriptionMessage}</p>
              <div className="action-row">
                <button
                  type="button"
                  className="ghost-button danger-button"
                  onClick={onDeleteTranscription}
                >
                  Excluir transcricao
                </button>
                <button type="button" className="primary-button" onClick={onSaveTranscription}>
                  Salvar transcricao
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
