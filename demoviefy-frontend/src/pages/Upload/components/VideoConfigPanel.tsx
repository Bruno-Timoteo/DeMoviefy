import type { AIModelOption, AITaskOption, VideoRecord } from "../types"

interface VideoConfigPanelProps {
  video: VideoRecord
  selectedTask: string
  selectedModelPath: string
  selectedFrameStride: string
  selectedConfidenceThreshold: string
  selectedMaxFrames: string
  selectedClipStart: string
  selectedClipEnd: string
  taskOptions: AITaskOption[]
  modelOptions: AIModelOption[]
  isBusy: boolean
  onTaskChange: (taskType: string) => void
  onModelChange: (modelPath: string) => void
  onFrameStrideChange: (value: string) => void
  onConfidenceThresholdChange: (value: string) => void
  onMaxFramesChange: (value: string) => void
  onClipStartChange: (value: string) => void
  onClipEndChange: (value: string) => void
  onSaveConfig: () => void
  onReprocess: () => void
  onDeleteVideo: () => void
}

export function VideoConfigPanel({
  video,
  selectedTask,
  selectedModelPath,
  selectedFrameStride,
  selectedConfidenceThreshold,
  selectedMaxFrames,
  selectedClipStart,
  selectedClipEnd,
  taskOptions,
  modelOptions,
  isBusy,
  onTaskChange,
  onModelChange,
  onFrameStrideChange,
  onConfidenceThresholdChange,
  onMaxFramesChange,
  onClipStartChange,
  onClipEndChange,
  onSaveConfig,
  onReprocess,
  onDeleteVideo,
}: VideoConfigPanelProps) {const filteredModels = modelOptions.filter((model) => model.task_type === selectedTask)

  return (
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
          <select value={selectedTask} onChange={(e) => onTaskChange(e.target.value)}>
            {taskOptions.map((task) => (
              <option key={task.task_type} value={task.task_type}>
                {task.task_label}
              </option>
            ))}
          </select>
        </label>

        <label className="field-block">
          <span>Modelo</span>
          <select value={selectedModelPath} onChange={(e) => onModelChange(e.target.value)}>
            {filteredModels.map((model) => (
              <option key={model.relative_path} value={model.relative_path}>
                {model.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field-block">
          <span>Stride de frames</span>
          <input type="number" min="1" step="1" value={selectedFrameStride}
            onChange={(e) => onFrameStrideChange(e.target.value)} />
        </label>

        <label className="field-block">
          <span>Confianca minima</span>
          <input type="number" min="0" max="1" step="0.01" value={selectedConfidenceThreshold}
            onChange={(e) => onConfidenceThresholdChange(e.target.value)} />
        </label>

        <label className="field-block">
          <span>Maximo de frames</span>
          <input type="number" min="1" step="1" value={selectedMaxFrames}
            onChange={(e) => onMaxFramesChange(e.target.value)} />
        </label>

        <label className="field-block">
          <span>Inicio da analise (s)</span>
          <input type="number" min="0" step="0.1" value={selectedClipStart}
            onChange={(e) => onClipStartChange(e.target.value)} />
        </label>

        <label className="field-block">
          <span>Fim da analise (s)</span>
          <input type="number" min="0" step="0.1" value={selectedClipEnd}
            onChange={(e) => onClipEndChange(e.target.value)}
            placeholder="Vazio = ate o fim" />
        </label>
      </div>

      <p className="field-help">
        Ajuste densidade, confianca e recorte para controlar exatamente como a IA vai analisar esse video.
      </p>

      <div className="action-row">
        <button type="button" className="ghost-button danger-button" onClick={onDeleteVideo}>
          Excluir video
        </button>
        <button type="button" className="ghost-button" onClick={onSaveConfig} disabled={isBusy}>
          Salvar configuracao
        </button>
        <button type="button" className="primary-button" onClick={onReprocess} disabled={isBusy}>
          {isBusy
            ? `Reprocessando... ${video.processing.processing_progress}%`
            : "Reprocessar video"}
        </button>
      </div>
    </section>
  )
}
