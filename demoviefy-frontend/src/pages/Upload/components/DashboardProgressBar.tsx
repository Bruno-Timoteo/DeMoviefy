// src/pages/Upload/components/DashboardProgressBar.tsx
import { useVideoStore } from "src/core/stores/useVideoStore";
import { useUploadStore } from "src/core/stores/useUploadStore";

export function DashboardProgressBar() {
  const uploading = useUploadStore((state) => state.uploading);
  const loadingVideos = useVideoStore((state) => state.loadingVideos);

  const processState = uploading
    ? { text: "Upload em andamento", progress: null }
    : loadingVideos
    ? { text: "Atualizando biblioteca", progress: null }
    : null;
    
  if (!processState) return null;

  const value = processState.progress ?? 0;

  return (
    <section className="surface site-progress-panel">
      <div className="site-progress-title">
        <strong>{processState.text}</strong>
        <span>{value ? `${value}%` : "..."}</span>
      </div>
      <div className="site-progress-bar" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </div>
    </section>
  );
}