// src/pages/Upload/components/DashboardHeader.tsx

interface DashboardHeaderProps {
  hasSelectedVideo: boolean;
  onToggleSidebar: () => void;
  onNewUpload: () => void;
}

export function DashboardHeader({ hasSelectedVideo, onToggleSidebar, onNewUpload }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <button
        className="menu-toggle"
        onClick={onToggleSidebar}
        aria-label="Abrir menu"
        title="Biblioteca de vídeos"
      >
        ☰
      </button>
      <h1 className="dashboard-title">DeMoviefy</h1>
      {hasSelectedVideo && (
        <button
          type="button"
          className="ghost-button"
          onClick={onNewUpload}
        >
          Novo upload
        </button>
      )}
      <div style={{ flex: 1 }} />
    </header>
  )
}