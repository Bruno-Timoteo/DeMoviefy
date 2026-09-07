export default function FeaturesSection() {
  return (
    <section className="w-full pb-24 pt-8 lg:pb-32 lg:pt-16">
      <div className="grid items-start gap-16 lg:grid-cols-2 lg:gap-24">
        <div>
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            Do vídeo às informações que importam.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400 lg:text-xl">
            O DeMoviefy automatiza diferentes etapas da análise audiovisual,
            reunindo informações relevantes em uma única plataforma.
          </p>

          {/* TODO: Quando trocar o placeholder da imagem, pegar uma que tenha um tamanho horizontal bom e um vertical pequeno, para ficar com as proporções legais. */}
          <div className="mt-10 max-w-xl overflow-hidden rounded-lg">
            <img
              src="src/assets/DeMoviefy-Demo.png"
              alt="Interface do DeMoviefy"
              className="w-full"
            />
          </div>
        </div>

        <div className="grid gap-10 lg:pt-2">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Legendas automáticas
            </h3>

            <p className="mt-3 max-w-xl text-base leading-7 text-neutral-400">
              Gere legendas a partir do áudio do vídeo e transforme o conteúdo
              falado em informações pesquisáveis.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              <span className="text-blue-600">Conteúdo sensível</span>
            </h3>

            <p className="mt-3 max-w-xl text-base leading-7 text-neutral-400">
              Identifique e categorize conteúdos sensíveis presentes no vídeo,
              facilitando o processo de revisão e moderação.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Classificação indicativa
            </h3>

            <p className="mt-3 max-w-xl text-base leading-7 text-neutral-400">
              Obtenha uma estimativa de classificação indicativa adequada ao
              conteúdo analisado.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              <span className="text-blue-600">Timestamps</span>
            </h3>

            <p className="mt-3 max-w-xl text-base leading-7 text-neutral-400">
              Navegue diretamente pelos momentos relevantes do vídeo por meio
              de marcações geradas durante a análise.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
