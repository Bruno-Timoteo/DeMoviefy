import { useCatalogStore } from "src/stores/useCatalogStore"
import type { AiConfigPayload, VideoRecord } from "src/pages/Upload/types"

interface VideoConfigPanelProps {
  video: VideoRecord
  config: AiConfigPayload
  onConfigChange: (config: AiConfigPayload) => void
  isBusy: boolean
  onSaveConfig: () => void
  onReprocess: () => void
  onDeleteVideo: () => void
}

export function VideoConfigPanel({
  video,
  config,
  onConfigChange,
  isBusy,
  onSaveConfig,
  onReprocess,
  onDeleteVideo,
}: VideoConfigPanelProps) {

  const { tasks, models } = useCatalogStore()

  const filteredModels = models.filter((m) => m.task_type === config.task_type)

  const update = (field: keyof AiConfigPayload, value: string | null) =>
    onConfigChange({ ...config, [field]: value })

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
                    <select value={config.task_type} onChange={(e) => update("task_type", e.target.value)}>
                        {tasks.map((task) => (
                            <option key={task.task_type} value={task.task_type}>
                                {task.task_label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="field-block">
                    <span>Modelo</span>
                    <select value={config.model_path} onChange={(e) => update("model_path", e.target.value)}>
                        {filteredModels.map((model) => (
                            <option key={model.relative_path} value={model.relative_path}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="field-block">
                    <span>Stride de frames</span>
                    <input type="number" min="1" step="1" value={config.frame_stride}
                        onChange={(e) => update("frame_stride", e.target.value)} />
                </label>

                <label className="field-block">
                    <span>Confianca minima</span>
                    <input type="number" min="0" max="1" step="0.01" value={config.confidence_threshold}
                        onChange={(e) => update("confidence_threshold", e.target.value)} />
                </label>

                <label className="field-block">
                    <span>Maximo de frames</span>
                    <input type="number" min="1" step="1" value={config.max_frames}
                        onChange={(e) => update("max_frames", e.target.value)} />
                </label>

                <label className="field-block">
                    <span>Inicio da analise (s)</span>
                    <input type="number" min="0" step="0.1" value={config.clip_start_sec}
                        onChange={(e) => update("clip_start_sec", e.target.value)} />
                </label>

                <label className="field-block">
                    <span>Fim da analise (s)</span>
                    <input type="number" min="0" step="0.1" value={config.clip_end_sec ?? ""}
                        onChange={(e) => update("clip_end_sec", e.target.value || null)}
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
