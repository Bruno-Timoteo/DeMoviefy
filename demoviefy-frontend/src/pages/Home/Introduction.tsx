import { Link } from "react-router-dom"

export default function Introduction() {

    return (
        <section className="grid w-full items-center gap-16 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24 lg:pb-20 lg:pt-16">
            <div className="max-w-2xl">
                <h1 className="text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl">
                    Analise seus vídeos.
                    <br />
                    Extraia mais deles.
                </h1>

                <p className="mt-6 text-lg leading-8 text-neutral-400 lg:text-xl">
                    O DeMoviefy utiliza inteligência artificial para processar vídeos,
                    detectar informações e gerar resultados estruturados.
                </p>

                <Link
                    to="/dashboard"
                    className="mt-8 inline-block rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500"
                >
                    Começar agora
                </Link>
            </div>

            <div className="overflow-hidden rounded-lg">
                <img
                    src="src/assets/DeMoviefy-Demo.png"
                    alt="Prévia de um vídeo sendo analisado pelo DeMoviefy"
                    className="w-full"
                />
            </div>

        </section>
    )
}