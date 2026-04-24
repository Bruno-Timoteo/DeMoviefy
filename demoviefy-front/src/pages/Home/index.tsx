import { Link } from "react-router-dom";

import { useAuth } from "../../features/auth/AuthContext";

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="surface rounded-[28px] px-5 py-5">
      <h3 className="text-xl font-semibold tracking-tight text-[var(--text)]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{text}</p>
    </article>
  );
}

function FeatureItem({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4">
      <strong className="text-base text-[var(--text)]">{title}</strong>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p>
    </article>
  );
}

export default function HomePage() {
  const { isAdmin } = useAuth();

  return (
    <div className="workspace">
      <section className="surface relative overflow-hidden rounded-[36px] px-7 py-8">
        <span className="eyebrow">DeMoviefy Platform</span>
        <h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-tight text-[var(--text)]">
          Analise de videos com IA, configuracao orientada a produto e governanca administrativa.
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--muted)]">
          O projeto combina upload de videos, analise com modelos de IA, transcricao, navegacao por timestamps e
          controle de configuracoes. Usuarios personalizam a experiencia dentro de limites seguros; administradores
          governam modelos, custo, seguranca e disponibilidade.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/guest" className="primary-button no-underline">
            Comece a usar
          </Link>
          <Link to="/login" className="ghost-button no-underline">
            Entrar
          </Link>
          {isAdmin && (
            <Link to="/admin/lab" className="ghost-button no-underline">
              Ir para laboratorio admin
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <InfoCard
          title="Do que o site trata"
          text="Uma plataforma para processamento e moderacao de videos com IA, combinando transcricao, classificacao, deteccao e analise de conteudo em uma experiencia unica."
        />
        <InfoCard
          title="Tecnologias usadas"
          text="Frontend em React + TypeScript + Tailwind/Vite, backend Flask em arquitetura MVC, SQLite para persistencia local e pipeline de modelos de IA com YOLO e Whisper."
        />
        <InfoCard
          title="Saiba mais"
          text="A proposta do sistema e separar o poder de configuracao do usuario da governanca do administrador, criando um produto flexivel, seguro e mais facil de escalar."
        />
      </section>

      <section className="surface rounded-[32px] px-6 py-6">
        <div className="max-w-4xl">
          <span className="eyebrow">Comece a Usar</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Escolha o tipo de acesso ideal para sua necessidade
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            O fluxo publico permite explorar a experiencia sem login. A area autenticada libera os controles
            administrativos e o laboratorio tecnico. A arquitetura agora esta preparada para evoluir para usuarios
            autenticados com historico e configuracoes persistidas.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-5">
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Uso sem login</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Ideal para exploracao inicial da plataforma. O objetivo e conhecer a interface, o player, a fila e a
              navegacao geral sem depender de credenciais.
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Nesta etapa, o modo convidado nao possui persistencia de conta ou historico pessoal entre acessos.
            </p>
            <div className="mt-5">
              <Link to="/guest" className="primary-button no-underline">
                Abrir modo convidado
              </Link>
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-5">
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Login e administracao</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Acesso ao laboratorio de testes, configuracoes sensiveis, governanca de modelos, seguranca operacional e
              funcoes administrativas do sistema.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/login" className="primary-button no-underline">
                Fazer login
              </Link>
              {isAdmin && (
                <Link to="/admin/lab" className="ghost-button no-underline">
                  Abrir laboratorio
                </Link>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="surface rounded-[32px] px-6 py-6">
          <span className="eyebrow">Funcionalidades de Usuario</span>
          <div className="mt-5 grid gap-4">
            <FeatureItem
              title="Upload, processamento e configuracao"
              text="Enviar videos, escolher modelos disponibilizados pelo sistema, configurar parametros como idioma, sensibilidade, categorias e nivel de deteccao."
            />
            <FeatureItem
              title="Configuracao avancada"
              text="Selecionar precisao vs desempenho, tipo de analise, ativar ou desativar recursos especificos como violencia, linguagem ofensiva ou classificacoes customizadas."
            />
            <FeatureItem
              title="Resultados e interacao"
              text="Visualizar transcricao, analise de conteudo, timestamps relevantes, trechos destacados, baixar resultados e reprocessar com novos parametros."
            />
          </div>
        </section>

        <section className="surface rounded-[32px] px-6 py-6">
          <span className="eyebrow">Funcionalidades de Admin</span>
          <div className="mt-5 grid gap-4">
            <FeatureItem
              title="Controle de modelos"
              text="Definir quais modelos estao disponiveis aos usuarios, restringir por custo, desempenho e limites de uso, e manter governanca sobre o catalogo."
            />
            <FeatureItem
              title="Seguranca, limites e monitoramento"
              text="Controlar tempo, tamanho e volume de processamento, impedir configuracoes invalidas, acompanhar logs, custos e comportamento do sistema."
            />
            <FeatureItem
              title="Gerenciamento geral"
              text="Gerenciar usuarios e permissoes, remover conteudos, manter integracoes e garantir que configuracoes avancadas nao comprometam a estabilidade."
            />
          </div>
        </section>
      </section>

      <section className="surface rounded-[32px] px-6 py-6">
        <span className="eyebrow">Regra de Negocio</span>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FeatureItem
            title="Personalizacao com governanca"
            text="O usuario escolhe apenas entre modelos e parametros liberados pelo sistema. O admin define disponibilidade, limites e seguranca operacional."
          />
          <FeatureItem
            title="Defesa profissional da proposta"
            text="A personalizacao foi pensada como diferencial do produto, mas sempre mediada pelo administrador para preservar estabilidade, custo e escalabilidade."
          />
        </div>
      </section>
    </div>
  );
}
