type StatusBadgeProps = {
    status: string;
};

const STATUS_LABELS: Record<string, string> = {
    PROCESSANDO: "Na fila",
    PROCESSANDO_IA: "Processando",
    PROCESSADO: "Concluído",
    SEM_ANALISE: "Sem análise",
    CANCELADO: "Cancelado",
    ERRO_ARQUIVO: "Erro no arquivo",
    ERRO_IA: "Erro na análise",
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const normalized = status.toUpperCase();
    const label = STATUS_LABELS[normalized] ?? status;
    const tone =
        normalized === "PROCESSADO"
            ? "success"
            : normalized === "CANCELADO"
                ? "danger"
                : normalized.startsWith("ERRO")
                    ? "danger"
                    : normalized === "PROCESSANDO_IA"
                        ? "processing"
                        : "warning"

    const toneClasses = {
        success: "bg-green-50 text-green-700",
        processing:"bg-blue-50 text-blue-700",
        warning: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-red-700",
    };



    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap ${toneClasses[tone]}`} > <span className="size-2 rounded-full bg-current" /> {label} </span>
    );
}
