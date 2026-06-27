// src/pages/Upload/components/StatsPanel.tsx

interface StatsPanelProps {
  total: number
  processing: number
  processed: number
  errors: number
}

export function StatsPanel({ total, processing, processed, errors }: StatsPanelProps) {
  return (
    <div className="dashboard-stats">
      <div className="stat-card">
        <span>Total</span>
        <strong>{total}</strong>
      </div>
      <div className="stat-card">
        <span>Em processamento</span>
        <strong>{processing}</strong>
      </div>
      <div className="stat-card">
        <span>Concluídos</span>
        <strong>{processed}</strong>
      </div>
      <div className="stat-card">
        <span>Com erro</span>
        <strong>{errors}</strong>
      </div>
    </div>
  )
}