import VideoDashboard from "../features/videos/VideoDashboard";

export default function Upload() {
  return (
    <section className="workspace">
      <section className="surface flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <span className="eyebrow">Admin Lab</span>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text)]">
            Ambiente de testes das funcoes do programa
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Aqui ficam os controles completos para experimentar modelos de IA, reprocessamento, transcricao,
            configuracoes de recorte e validacao tecnica do pipeline.
          </p>
        </div>
      </section>
      <VideoDashboard />
    </section>
  );
}
