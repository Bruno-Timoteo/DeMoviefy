// src/pages/Upload/components/NewVideoPanel.tsx
import { useCallback, useRef, useState, useEffect } from "react";
import { useUpload } from "src/pages/Upload/hooks/useUpload";
import { useUploadStore } from "src/core/stores/useUploadStore";
import { useCatalogStore } from "src/core/stores/useAICatalogStore";

import "/src/pages/Upload/styles/NewVideoPanel.css";

export function NewVideoPanel() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados globais do Catálogo
  const {
    tasks,
    models,
    uploadTask,
    uploadModelPath,
    handleUploadTaskChange,
    setUploadModelPath,
    fetchCatalog,
  } = useCatalogStore();


    useEffect(() => {
    fetchCatalog();
    }, [fetchCatalog]);



    // Estados locais do formulário

  const {
    file, setFile, uploadFrameStride, setUploadFrameStride,
    uploadConfidenceThreshold, setUploadConfidenceThreshold,
    uploadMaxFrames, setUploadMaxFrames, uploadClipStart, setUploadClipStart,
    uploadClipEnd, setUploadClipEnd, handleUpload
  } = useUpload();

  // Estados globais da UI
  const uploading = useUploadStore((state) => state.uploading);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0]);
    },
    [setFile]
  );

  const handleClick = () => fileInputRef.current?.click();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
  };

  const filteredModels = uploadTask
    ? models.filter((m) => m.task_type === uploadTask)
    : [];

  return (
    <div className="new-video-panel">
      {/* Header */}
      <div className="panel-header">
        <h3>+ Novo Vídeo</h3>
      </div>

      {/* Dropzone */}
      <div
        className={`file-dropzone ${isDragging ? "dragging" : ""} ${
          file ? "has-file" : ""
        }`}
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

      {/* Configuration Section */}
      {file && (
        <div className="config-section">
          <div className="config-group">
            <label htmlFor="task-select">Tarefa IA</label>
            <select
              id="task-select"
              value={uploadTask}
              onChange={(e) => handleUploadTaskChange(e.target.value)}
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

          {uploadTask && (
            <div className="config-group">
              <label htmlFor="model-select">Modelo</label>
              <select
                id="model-select"
                value={uploadModelPath}
                onChange={(e) => setUploadModelPath(e.target.value)}
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
                value={uploadFrameStride}
                onChange={(e) => setUploadFrameStride(e.target.value)}
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
                value={uploadConfidenceThreshold}
                onChange={(e) => setUploadConfidenceThreshold(e.target.value)}
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
                value={uploadMaxFrames}
                onChange={(e) => setUploadMaxFrames(e.target.value)}
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
                value={uploadClipStart}
                onChange={(e) => setUploadClipStart(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="param-input">
              <label htmlFor="clipend">Fim (s)</label>
              <input
                id="clipend"
                type="number"
                min="0"
                value={uploadClipEnd}
                onChange={(e) => setUploadClipEnd(e.target.value)}
                className="form-input"
                placeholder="Vídeo inteiro"
              />
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => handleUpload(uploadTask, uploadModelPath)}
            disabled={!uploadTask || !uploadModelPath || uploading}
            className="primary-button full-width"
            aria-busy={uploading}
          >
            {uploading ? "Enviando..." : "Enviar Vídeo"}
          </button>

        </div>
      )}
    </div>
  );
}