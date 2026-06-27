// src/pages/Upload/components/DashboardHeader.tsx

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
}

export function DashboardHeader({ onToggleSidebar }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <button
        className="menu-toggle"
        onClick={onToggleSidebar}
        aria-label="Abrir menu"
        title="Biblioteca de vídeos"
      >
        
      </button>
      <h1 className="dashboard-title">DeMoviefy</h1>
      <div style={{ flex: 1 }} />
    </header>
  )
}