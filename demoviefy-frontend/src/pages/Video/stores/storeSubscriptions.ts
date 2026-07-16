// src/pages/Video/stores/storeSubscriptions.ts

import { useVideoDetailStore } from "src/pages/Video/stores/useVideoDetailStore";
import { useAnalysisStore } from "src/pages/Video/stores/useAnalysisStore"
import { toast } from "sonner";

export function registerStoreSubscriptions() {
    useVideoDetailStore.subscribe((state, prevState) => {

        const previousStatus = prevState.video?.status;
        const currentStatus = state.video?.status;

        const idChanged = state.video?.id !== prevState.video?.id;

        const wasProcessing = previousStatus?.startsWith("PROCESSANDO") ?? false;

        const isProcessing = currentStatus?.startsWith("PROCESSANDO") ?? false;

        const startedProcessing = !wasProcessing && isProcessing;

        const finishedProcessing = wasProcessing && currentStatus === "PROCESSADO";

        // Resetar dados do vídeo.
        // 
        // Isso serve para quando a pessoa vai de /video/{x}
        // para video/{y} diretamente pelo link, sem passar pela interface,
        // ou então quando o vídeo começa e termina de processar.

        // Essas funções são limpas para que os dados antigos do vídeo não sejam exibidos.
        if (idChanged || finishedProcessing) {
            useAnalysisStore.setState({ selectedAnalysisVariantId: null });
        }

        useAnalysisStore.getState().resetArtifactSignature();

        if (idChanged || startedProcessing || finishedProcessing) {
            void useAnalysisStore.getState().syncAnalysisWithSelectedVideo();
        }

        if (startedProcessing) {
            toast("Reprocessamento iniciado.");
        }

        if (finishedProcessing) {
            toast.success("Reprocessamento concluído.");
        }
    });
}