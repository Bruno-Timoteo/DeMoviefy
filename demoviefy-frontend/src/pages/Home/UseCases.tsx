export default function UseCases() {

    return (
        <section className="w-full pb-20 pt-4 lg:pb-20 lg:pt-8">
            <div className="text-center">
                <h2 className="mx-auto max-w-200 text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
                    Feito para aproveitar melhor seus vídeos.
                </h2>

                <p className="mx-auto mt-6 w-full text-lg leading-8 text-neutral-400 lg:text-xl">
                    O DeMoviefy reúne ferramentas para transformar diferentes partes do
                    conteúdo audiovisual em informações úteis.
                </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3 lg:mt-20">

                <div>
                    <div className="overflow-hidden rounded-lg">
                        <img
                            src="src/assets/DeMoviefy-Demo.png"
                            alt="Análise de conteúdo no DeMoviefy"
                            className="w-full"
                        />
                    </div>

                    <h3 className="mt-5 text-xl font-semibold tracking-tight">
                        Análise
                    </h3>

                    <p className="mt-3 text-base leading-7 text-neutral-400">
                        Extraia informações do conteúdo e organize os resultados de forma
                        estruturada.
                    </p>
                </div>

                <div>
                    <div className="overflow-hidden rounded-lg">
                        <img
                            src="src/assets/DeMoviefy-Demo.png"
                            alt="Transcrição de vídeo no DeMoviefy"
                            className="w-full"
                        />
                    </div>

                    <h3 className="mt-5 text-xl font-semibold tracking-tight">
                        Transcrição
                    </h3>

                    <p className="mt-3 text-base leading-7 text-neutral-400">
                        Transforme o áudio dos seus vídeos em texto e encontre informações
                        importantes com mais facilidade.
                    </p>
                </div>



                <div>
                    <div className="overflow-hidden rounded-lg">
                        <img
                            src="src/assets/DeMoviefy-Demo.png"
                            alt="Novos recursos do DeMoviefy"
                            className="w-full"
                        />
                    </div>

                    <h3 className="mt-5 text-xl font-semibold tracking-tight">
                        Mais por vir
                    </h3>

                    <p className="mt-3 text-base leading-7 text-neutral-400">
                        Novos recursos serão adicionados para ampliar as possibilidades de
                        análise dos seus vídeos.
                    </p>
                </div>
            </div>
        </section>
    )
}