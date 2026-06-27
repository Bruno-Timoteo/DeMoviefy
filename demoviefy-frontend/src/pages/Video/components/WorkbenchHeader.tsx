// src/pages/Upload/components/WorkbenchHeader.tsx

import { StatusBadge } from "src/core/components/StatusBadge"
import { ProcessingProgress } from "src/core/components/ProcessingProgress"
import type { VideoRecord } from "src/pages/Upload/types"

type WorkbenchHeaderProps = {
  video: VideoRecord
}

export function WorkbenchHeader({ video }: WorkbenchHeaderProps) {
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Workbench</span>
          <h2>{video.filename}</h2>
        </div>
        <StatusBadge status={video.status} />
      </div>

      {video.status.startsWith("PROCESSANDO") && (
        <ProcessingProgress
          progress={video.processing.processing_progress}
          stage={video.processing.processing_stage}
          etaSeconds={video.processing.processing_eta_seconds}
          message={video.processing.processing_message}
        />
      )}
    </>
  )
}