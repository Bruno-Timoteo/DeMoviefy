// src/pages/Upload/components/AnalysisEditor.tsx

import { ConfirmationDialog } from "src/core/components/ConfirmationDialog"

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
          <span className="eyebrow">Análise</span>
          <h3>JSON da análise</h3>
        </div>
      </div>
      <textarea
        className="editor-area"
        value={analysisDraft}
        onChange={(e) => onDraftChange(e.target.value)}
        spellCheck={false}
      />
      <div className="action-row">
        
        <ConfirmationDialog
          title="Excluir análise"
          message= {hasMultipleVariants ? "Tem certeza de que deseja excluir a análise selecionada? Esta ação é irreversível." : "Tem certeza de que deseja excluir a análise deste vídeo? Esta ação é irreversível."}
          onConfirm={onDelete}
          >
          {(open) => (
              <button type="button" className="ghost-button danger-button" onClick={open}>
                {hasMultipleVariants ? "Excluir versão selecionada" : "Excluir análise"}
              </button>
          )}
          </ConfirmationDialog>

        <button type="button" className="primary-button" onClick={onSave} disabled={isBusy}>
          Salvar análise
        </button>
      </div>
    </section>
  )
}