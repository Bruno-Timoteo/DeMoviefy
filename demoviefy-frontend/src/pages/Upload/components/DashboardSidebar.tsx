// src/pages/Upload/components/DashboardSidebar.tsx

import { useVideoStore } from "src/core/stores/useVideoStore"
import { selectVideo } from "src/pages/Upload/actions/selectVideo"
import { VideoLibrary } from "src/pages/Upload/components/VideoLibrary"

interface DashboardSidebarProps {
  open: boolean
  onClose: () => void
}

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {

  const videos = useVideoStore((state) => state.videos);
  const selectedVideoId = useVideoStore((state) => state.selectedVideoId);
  const loading = useVideoStore((state) => state.loadingVideos);

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
          selectedVideoId={selectedVideoId}
          loading={loading}
          onSelect={(id) => {
            selectVideo(id)
            onClose()
          }}
        />
      </aside>
    </>
  )
}