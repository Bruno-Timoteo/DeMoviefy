import { VideoLibrary } from "src/pages/Upload/components/VideoLibrary"
import type { VideoRecord } from "src/pages/Upload/types"

interface DashboardSidebarProps {
  open: boolean
  videos: VideoRecord[]
  selectedVideoId: number | null
  loading: boolean
  onSelect: (id: number) => void
  onClose: () => void
}

export function DashboardSidebar({ open, videos, selectedVideoId, loading, onSelect, onClose }: DashboardSidebarProps) {
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
            onSelect(id)
            onClose()
          }}
        />
      </aside>
    </>
  )
}