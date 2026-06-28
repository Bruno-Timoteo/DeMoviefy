// src/pages/Upload/components/DashboardSidebar.tsx

import { useVideoStore } from "src/core/stores/useVideoStore"
import { useNavigate } from "react-router-dom";
import { VideoLibrary } from "src/pages/Upload/components/VideoLibrary"

interface DashboardSidebarProps {
  open: boolean
  onClose: () => void
}

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {

  const videos = useVideoStore((state) => state.videos);
  const loading = useVideoStore((state) => state.loadingVideos);
  const navigate = useNavigate();

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
            onSelect={(id) => {
                navigate(`/video/${id}`);
                onClose();
            }}
        />
      </aside>
    </>
  )
}