import { useCallback, useRef, useState } from "react";
import type { AIModelOption, AITaskOption } from "../types";
import "../styles/NewVideoPanel.css";

interface NewVideoPanelProps {
  file: File | null;
  message: string;
  hint: string;
  uploading: boolean;
  selectedTask: string;
  selectedModelPath: string;
  frameStride: number;
  confidenceThreshold: number;
  maxFrames: number;
  clipStart: number;
  clipEnd: number | null;
  tasks: AITaskOption[];
  models: AIModelOption[];
  onFileChange: (file: File | null) => void;
  onTaskChange: (taskType: string) => void;
  onModelChange: (modelPath: string) => void;
  onFrameStrideChange: (value: number) => void;
  onConfidenceThresholdChange: (value: number) => void;
  onMaxFramesChange: (value: number) => void;
  onClipStartChange: (value: number) => void;
  onClipEndChange: (value: number | null) => void;
  onUpload: () => void;
  onRefresh: () => void;
}

export function NewVideoPanel({
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
}: NewVideoPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileChange(files[0]);
      }
    },
    [onFileChange]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileChange(e.target.files[0]);
    }
  };

  const filteredModels = selectedTask
    ? models.filter((m) => m.task_type === selectedTask)
    : [];

  return (
    <div className="new-video-panel">
      {/* Header */}
      <div className="panel-header">
        <h3>+ Novo Vídeo</h3>
        <button
          onClick={onRefresh}
          className="ghost-button"
          title="Atualizar lista"
          aria-label="Atualizar lista de vídeos"
        >
          ↻
        </button>
      </div>

      {/* Dropzone */}
      <div
        className={`file-dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Arrastar vídeo ou clicar para selecionar"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInputChange}
          style={{ display: "none" }}
          aria-hidden="true"
        />

        {file ? (
          <div className="file-selected">
            <span className="file-icon">🎬</span>
            <span className="file-name">{file.name}</span>
            <span className="file-size">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        ) : (
          <div className="file-placeholder">
            <span className="drop-icon">📁</span>
            <span className="drop-text">Arraste vídeo aqui</span>
            <span className="drop-hint">ou clique para selecionar</span>
          </div>
        )}
      </div>

      {/* Status Message */}
      {message && (
        <div className={`status-message ${message.includes("Erro") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      {/* Configuration Section */}
      {file && (
        <div className="config-section">
          <div className="config-group">
            <label htmlFor="task-select">Tarefa IA</label>
            <select
              id="task-select"
              value={selectedTask}
              onChange={(e) => onTaskChange(e.target.value)}
              className="form-select"
            >
              <option value="">Selecione uma tarefa</option>
              {tasks.map((task) => (
                <option key={task.task_type} value={task.task_type}>
                  {task.task_label}
                </option>
              ))}
            </select>
          </div>

          {selectedTask && (
            <div className="config-group">
              <label htmlFor="model-select">Modelo</label>
              <select
                id="model-select"
                value={selectedModelPath}
                onChange={(e) => onModelChange(e.target.value)}
                className="form-select"
              >
                <option value="">Selecione um modelo</option>
                {filteredModels.map((model) => (
                  <option key={model.id} value={model.relative_path}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Compact Parameter Grid */}
          <div className="params-grid">
            <div className="param-input">
              <label htmlFor="stride">Stride</label>
              <input
                id="stride"
                type="number"
                min="1"
                max="30"
                value={frameStride}
                onChange={(e) => onFrameStrideChange(parseInt(e.target.value, 10))}
                className="form-input"
              />
            </div>

            <div className="param-input">
              <label htmlFor="confidence">Confiança</label>
              <input
                id="confidence"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => onConfidenceThresholdChange(parseFloat(e.target.value))}
                className="form-input"
              />
            </div>

            <div className="param-input">
              <label htmlFor="maxframes">Max Frames</label>
              <input
                id="maxframes"
                type="number"
                min="1"
                max="600"
                value={maxFrames}
                onChange={(e) => onMaxFramesChange(parseInt(e.target.value, 10))}
                className="form-input"
              />
            </div>
          </div>

          {/* Clip Range */}
          <div className="clip-section">
            <div className="param-input">
              <label htmlFor="clipstart">Começo (s)</label>
              <input
                id="clipstart"
                type="number"
                min="0"
                value={clipStart}
                onChange={(e) => onClipStartChange(parseInt(e.target.value, 10))}
                className="form-input"
              />
            </div>

            <div className="param-input">
              <label htmlFor="clipend">Fim (s)</label>
              <input
                id="clipend"
                type="number"
                min="0"
                value={clipEnd ?? ""}
                onChange={(e) =>
                  onClipEndChange(e.target.value ? parseInt(e.target.value, 10) : null)
                }
                className="form-input"
                placeholder="Vídeo inteiro"
              />
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={onUpload}
            disabled={!selectedTask || !selectedModelPath || uploading}
            className="primary-button full-width"
            aria-busy={uploading}
          >
            {uploading ? "Enviando..." : "Enviar Vídeo"}
          </button>

          {hint && <div className="hint-text">{hint}</div>}
        </div>
      )}
    </div>
  );
}
