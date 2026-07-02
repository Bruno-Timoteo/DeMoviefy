// src/pages/Upload/components/DashboardSidebar.tsx

import { useVideoListStore } from "src/pages/Upload/stores/useVideoListStore"
import { VideoLibrary } from "src/pages/Upload/components/VideoLibrary"

interface DashboardSidebarProps {
  open: boolean
  onClose: () => void
}

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {

  const videos = useVideoListStore((state) => state.videos);
  const loading = useVideoListStore((state) => state.loadingVideos);

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? "show" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`dashboard-sidebar ${open ? "open" : ""}`}>
        <div className="dashboard-sidebar-header">
          <h2>Biblioteca</h2>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Fechar sidebar"
          >
            ✕
          </button>
        </div>
        <VideoLibrary
            videos={videos}
            loading={loading}
            onNavigate={onClose}
        />
      </aside>
    </>
  )
}