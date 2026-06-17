import { formatTimecode } from "../utils/helpers"

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
  isBusy: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
  onDelete: () => void
  onGenerate: () => void
  onSeek: (seconds: number) => void
}

export function TranscriptionEditor({
  transcriptionDraft,
  transcriptionMessage,
  segments,
  isBusy,
  onDraftChange,
  onSave,
  onDelete,
  onGenerate,
  onSeek,
}: TranscriptionEditorProps) {

  return (
    <section className="editor-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Transcricao</span>
          <h3>Texto editavel</h3>
        </div>
      </div>
      <div className="action-row action-row-start">
        <button type="button" className="ghost-button" onClick={onGenerate} disabled={isBusy}>
          {isBusy ? "Transcricao aguardando..." : "Gerar transcricao IA"}
        </button>
      </div>
      <textarea
        className="editor-area transcription-area"
        value={transcriptionDraft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Cole ou escreva aqui a transcricao do video."
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
      <div className="action-row">
        <button type="button" className="ghost-button danger-button" onClick={onDelete} disabled={isBusy}>
          Excluir transcricao
        </button>
        <button type="button" className="primary-button" onClick={onSave} disabled={isBusy}>
          Salvar transcricao
        </button>
      </div>
    </section>
  )
}