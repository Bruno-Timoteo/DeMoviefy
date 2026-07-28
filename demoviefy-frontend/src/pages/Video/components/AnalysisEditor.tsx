interface AnalysisEditorProps {
  analysisDraft: string
}

/** Displays the raw AI payload without exposing a manual editing path. */
export function AnalysisEditor({ analysisDraft }: AnalysisEditorProps) {
  return (
    <section className="editor-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Analise</span>
          <h3>JSON gerado pela IA</h3>
        </div>
      </div>
      <textarea
        className="editor-area"
        value={analysisDraft}
        readOnly
        spellCheck={false}
        aria-label="Resultado da analise gerada pela IA (somente leitura)"
      />
    </section>
  )
}
