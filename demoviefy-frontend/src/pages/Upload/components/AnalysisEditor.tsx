// components/AnalysisEditor.tsx
interface AnalysisEditorProps {
  analysisDraft: string
  hasMultipleVariants: boolean
  isBusy: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
  onDelete: () => void
}

export function AnalysisEditor({
  analysisDraft,
  hasMultipleVariants,
  isBusy,
  onDraftChange,
  onSave,
  onDelete,
}: AnalysisEditorProps) {
  return (
    <section className="editor-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Analise</span>
          <h3>JSON editavel</h3>
        </div>
      </div>
      <textarea
        className="editor-area"
        value={analysisDraft}
        onChange={(e) => onDraftChange(e.target.value)}
        spellCheck={false}
      />
      <div className="action-row">
        <button type="button" className="ghost-button danger-button" onClick={onDelete}>
          {hasMultipleVariants ? "Excluir versao selecionada" : "Excluir analise"}
        </button>
        <button type="button" className="primary-button" onClick={onSave} disabled={isBusy}>
          Salvar analise
        </button>
      </div>
    </section>
  )
}