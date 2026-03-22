import type { ChangeEvent } from "react";

import type { AIModelOption, AITaskOption } from "../types";

type UploadComposerProps = {
  file: File | null;
  message: string;
  hint: string;
  uploading: boolean;
  selectedTask: string;
  selectedModelPath: string;
  tasks: AITaskOption[];
  models: AIModelOption[];
  onFileChange: (file: File | null) => void;
  onTaskChange: (taskType: string) => void;
  onModelChange: (modelPath: string) => void;
  onUpload: () => void;
  onRefresh: () => void;
};

export function UploadComposer({
  file,
  message,
  hint,
  uploading,
  selectedTask,
  selectedModelPath,
  tasks,
  models,
  onFileChange,
  onTaskChange,
  onModelChange,
  onUpload,
  onRefresh,
}: UploadComposerProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0] ?? null);
  };

  const filteredModels = models.filter((model) => model.task_type === selectedTask);
  void [selectedModelPath, tasks, onTaskChange, onModelChange, filteredModels];

  return (
    <section className="surface hero-panel">
      <div className="eyebrow">Pipeline de Moderacao</div>
      <h1>Envie um video e acompanhe a analise no mesmo lugar.</h1>
      <p className="hero-copy">
        O backend salva o arquivo em <code>uploads/</code>, gera o resumo em
        <code>uploads/analysis/</code> e a tela mostra esse caminho sem esconder o fluxo.
      </p>

      <div className="upload-shell">
        <label className="file-dropzone">
          <span className="file-dropzone-title">
            {file ? "Arquivo selecionado" : "Escolha um video"}
          </span>
          <span className="file-dropzone-subtitle">
            {file ? `${file.name} • ${(file.size / (1024 * 1024)).toFixed(2)} MB` : "MP4, MOV, AVI, MKV ou WEBM"}
          </span>
          <input type="file" accept="video/*" onChange={handleFileChange} />
        </label>

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
}
