import { createRoot, type Root } from "react-dom/client";

import "./styles/global.css";

function StartupScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="app-shell">
      <section className="surface crash-panel">
        <span className="eyebrow">Inicializacao</span>
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </div>
  );
}

function FatalStartupScreen({ errorMessage }: { errorMessage: string }) {
  return (
    <div className="app-shell">
      <section className="surface crash-panel">
        <span className="eyebrow">Inicializacao</span>
        <h1>O frontend nao conseguiu carregar.</h1>
        <p>
          Em vez de deixar a pagina em branco, o bootstrap exibiu esta tela. Reinicie o frontend e o backend e,
          se o problema continuar, use a mensagem abaixo para depurarmos.
        </p>
        <code>{errorMessage}</code>
        <div className="action-row action-row-start">
          <button type="button" className="primary-button" onClick={() => window.location.reload()}>
            Recarregar pagina
          </button>
        </div>
      </section>
    </div>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento #root nao encontrado no index.html.");
}

const root = createRoot(rootElement);

function renderFatal(rootInstance: Root, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao iniciar a interface.";
  console.error("DeMoviefy startup error:", error);
  rootInstance.render(<FatalStartupScreen errorMessage={errorMessage} />);
}

window.addEventListener("error", (event) => {
  renderFatal(root, event.error ?? new Error(event.message));
});

window.addEventListener("unhandledrejection", (event) => {
  renderFatal(root, event.reason);
});

root.render(
  <StartupScreen
    title="Carregando o painel"
    message="Estamos preparando a interface e validando os modulos principais."
  />,
);

void Promise.all([import("./components/ErrorBoundary"), import("./app/App")])
  .then(([errorBoundaryModule, appModule]) => {
    const ErrorBoundary = errorBoundaryModule.ErrorBoundary;
    const App = appModule.default;

    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    );
  })
  .catch((error) => {
    renderFatal(root, error);
  });
