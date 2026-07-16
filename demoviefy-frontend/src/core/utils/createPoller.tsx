// src/core/utils/createPoller.tsx

// Arquivo responsável por centralizar as funções de status de processamento de vídeo,
// mantendo o princípio DRY nos componentes que precisam de uma implementação delas.

export function createPoller(intervalMs: number) {
  let timer: number | null = null;

  return {
    start(callback: () => void) {
      if (timer !== null) return false;

      timer = window.setInterval(callback, intervalMs);
      return true;
    },
    stop() {
      if (timer === null) return false;

      window.clearInterval(timer);
      timer = null;

      return true;
    },
  };
}