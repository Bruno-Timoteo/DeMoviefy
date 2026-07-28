import { formatTimecode } from "src/pages/Upload/utils/helpers"

interface TranscriptionSegment {
  id: number
  start: number
  end: number
  text: string
}

interface TranscriptionEditorProps {
  transcriptionDraft: string
  transcriptionMessage: string
  segments: TranscriptionSegment[]
  onSeek: (seconds: number) => void
}

/** AI transcription is intentionally presented as a read-only result. */
export function TranscriptionEditor({
  transcriptionDraft,
  transcriptionMessage,
  segments,
  onSeek,
}: TranscriptionEditorProps) {
  return (
    <section className="editor-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Transcricao</span>
          <h3>Texto gerado pela IA</h3>
        </div>
      </div>
      <textarea
        className="editor-area transcription-area"
        value={transcriptionDraft}
        readOnly
        aria-label="Transcricao gerada pela IA (somente leitura)"
      />
      <p className="transcription-note">{transcriptionMessage}</p>
      {segments.length > 0 && (
        <div className="segment-list">
          {segments.map((segment) => (
            <button
              key={`${segment.id}-${segment.start}`}
              type="button"
              className="segment-item"
              onClick={() => onSeek(segment.start)}
            >
              <span className="segment-time">
                {formatTimecode(segment.start)} - {formatTimecode(segment.end)}
              </span>
              <span className="segment-text">{segment.text}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
