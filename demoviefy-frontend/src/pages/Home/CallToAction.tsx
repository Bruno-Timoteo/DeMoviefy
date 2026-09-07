import { Link } from "react-router-dom";

export default function CallToAction() {
  return (
    <section className="w-full pb-24 lg:pb-32">
      <div className="text-center">
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
          Pronto para começar?
        </h2>

        <p className="mx-auto mt-6 text-lg leading-8 text-neutral-400 lg:text-xl">
          Analise seus vídeos e transforme conteúdo audiovisual em informações úteis.
        </p>

        <Link
          to="/dashboard"
          className="mt-8 inline-block rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500"
        >
          Começar agora
        </Link>
      </div>
    </section>
  );
}