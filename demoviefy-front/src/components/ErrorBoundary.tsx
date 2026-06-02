import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || "Erro inesperado na interface.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DeMoviefy UI error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <section className="surface crash-panel">
            <span className="eyebrow">Interface</span>
            <h1>O painel encontrou um erro.</h1>
            <p>
              A interface foi protegida para nao ficar em branco. Voce pode recarregar a pagina e tentar novamente.
            </p>
            <code>{this.state.errorMessage}</code>
            <div className="action-row action-row-start">
              <button type="button" className="primary-button" onClick={this.handleReload}>
                Recarregar pagina
              </button>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
