// src/core/utils/createPoller.tsx

// Arquivo responsável por centralizar as funções de status de processamento de vídeo,
// mantendo o princípio DRY nos componentes que precisam de uma implementação delas.

export function createPoller(intervalMs: number) {
  let timer: number | null = null;

  return {
    start(callback: () => void) {
      if (timer !== null) return;
      timer = window.setInterval(callback, intervalMs);
    },
    stop() {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    },
  };
}