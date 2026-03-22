import { memo, type ChangeEvent } from "react";

import type { AIModelOption, AITaskOption } from "../types";

type UploadComposerPanelProps = {
  file: File | null;
  message: string;
  hint: string;
  uploading: boolean;
  selectedTask: string;
  selectedModelPath: string;
  frameStride: string;
  confidenceThreshold: string;
  maxFrames: string;
  clipStart: string;
  clipEnd: string;
  tasks: AITaskOption[];
  models: AIModelOption[];
  onFileChange: (file: File | null) => void;
  onTaskChange: (taskType: string) => void;
  onModelChange: (modelPath: string) => void;
  onFrameStrideChange: (value: string) => void;
  onConfidenceThresholdChange: (value: string) => void;
  onMaxFramesChange: (value: string) => void;
  onClipStartChange: (value: string) => void;
  onClipEndChange: (value: string) => void;
  onUpload: () => void;
  onRefresh: () => void;
};

export const UploadComposerPanel = memo(function UploadComposerPanel({
  file,
  message,
  hint,
  uploading,
  selectedTask,
  selectedModelPath,
  frameStride,
  confidenceThreshold,
  maxFrames,
  clipStart,
  clipEnd,
  tasks,
  models,
  onFileChange,
  onTaskChange,
  onModelChange,
  onFrameStrideChange,
  onConfidenceThresholdChange,
  onMaxFramesChange,
  onClipStartChange,
  onClipEndChange,
  onUpload,
  onRefresh,
}: UploadComposerPanelProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0] ?? null);
  };

  const filteredModels = models.filter((model) => model.task_type === selectedTask);

  return (
    <section className="surface hero-panel">
      <div className="eyebrow">Pipeline de Moderacao</div>
      <h1>Envie um video e acompanhe a analise no mesmo lugar.</h1>
      <p className="hero-copy">
        O backend salva o arquivo em <code>uploads/</code>, registra a tarefa
        escolhida, processa o video e deixa a analise e a transcricao
        editaveis depois.
      </p>

      <div className="upload-shell">
        <div className="upload-config-stack">
          <label className="file-dropzone">
            <span className="file-dropzone-title">
              {file ? "Arquivo selecionado" : "Escolha um video"}
            </span>
            <span className="file-dropzone-subtitle">
              {file
                ? `${file.name} • ${(file.size / (1024 * 1024)).toFixed(2)} MB`
                : "MP4, MOV, AVI, MKV ou WEBM"}
            </span>
            <input type="file" accept="video/*" onChange={handleFileChange} />
          </label>

          <div className="config-grid">
            <label className="field-block">
              <span>Tarefa de IA</span>
              <select value={selectedTask} onChange={(event) => onTaskChange(event.target.value)}>
                {tasks.map((task) => (
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

            <label className="field-block">
              <span>Stride de frames</span>
              <input
                type="number"
                min="1"
                step="1"
                value={frameStride}
                onChange={(event) => onFrameStrideChange(event.target.value)}
              />
            </label>

            <label className="field-block">
              <span>Confianca minima</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={confidenceThreshold}
                onChange={(event) => onConfidenceThresholdChange(event.target.value)}
              />
            </label>

            <label className="field-block">
              <span>Maximo de frames</span>
              <input
                type="number"
                min="1"
                step="1"
                value={maxFrames}
                onChange={(event) => onMaxFramesChange(event.target.value)}
              />
            </label>

            <label className="field-block">
              <span>Inicio da analise (s)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={clipStart}
                onChange={(event) => onClipStartChange(event.target.value)}
              />
            </label>

            <label className="field-block">
              <span>Fim da analise (s)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={clipEnd}
                onChange={(event) => onClipEndChange(event.target.value)}
                placeholder="Vazio = ate o fim"
              />
            </label>
          </div>
          <p className="field-help">
            Escolha exatamente qual trecho do video sera analisado. O preview anotado mostrara esse mesmo recorte.
          </p>
        </div>

        <div className="hero-actions">
          <button type="button" className="primary-button" onClick={onUpload} disabled={uploading}>
            {uploading ? "Enviando..." : "Enviar video"}
          </button>
          <button type="button" className="ghost-button" onClick={onRefresh}>
            Atualizar biblioteca
          </button>
        </div>
      </div>

      {(message || hint) && (
        <div className="message-stack">
          {message && <p className="message-line">{message}</p>}
          {hint && <p className="hint-line">{hint}</p>}
        </div>
      )}
    </section>
  );
});
