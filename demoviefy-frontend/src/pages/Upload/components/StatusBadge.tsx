type StatusBadgeProps = {
  status: string;
};

const STATUS_LABELS: Record<string, string> = {
  PROCESSANDO: "Na fila",
  PROCESSANDO_IA: "Analisando",
  PROCESSADO: "Concluído",
  SEM_ANALISE: "Sem análise",
  ERRO_ARQUIVO: "Erro no arquivo",
  ERRO_IA: "Erro na análise",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  const label = STATUS_LABELS[normalized] ?? status;
  const tone =
    normalized === "PROCESSADO"
      ? "success"
      : normalized.startsWith("ERRO")
        ? "danger"
        : "warning";

  return (
    <span className={`status-badge status-${tone}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}
