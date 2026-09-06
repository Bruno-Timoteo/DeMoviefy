// src/pages/Dashboard/components/StatsPanel.tsx

interface StatsPanelProps {
  total: number;
  processing: number;
  processed: number;
  errors: number;
}

export function StatsPanel({
  total,
  processing,
  processed,
  errors,
}: StatsPanelProps) {
  return (
    <section className="grid grid-cols-2 gap-8 border-b border-neutral-200 pb-8 md:grid-cols-4">
      <div>
        <span className="text-sm font-medium text-neutral-500">
          Vídeos
        </span>

        <strong className="mt-2 block text-3xl font-semibold tracking-tight text-neutral-900">
          {total}
        </strong>
      </div>

      <div>
        <span className="text-sm font-medium text-blue-600">
          Processando
        </span>

        <strong className="mt-2 block text-3xl font-semibold tracking-tight text-neutral-900">
          {processing}
        </strong>
      </div>

      <div>
        <span className="text-sm font-medium text-green-600">
          Concluídos
        </span>

        <strong className="mt-2 block text-3xl font-semibold tracking-tight text-neutral-900">
          {processed}
        </strong>
      </div>

      <div>
        <span className="text-sm font-medium text-red-600">
          Erros
        </span>

        <strong className="mt-2 block text-3xl font-semibold tracking-tight text-neutral-900">
          {errors}
        </strong>
      </div>
    </section>
  );
}