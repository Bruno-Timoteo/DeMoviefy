// src/pages/Video/stores/storeSubscriptions.ts

import { useVideoDetailStore } from "src/pages/Video/stores/useVideoDetailStore";
import { useAnalysisStore } from "src/pages/Video/stores/useAnalysisStore"
import { toast } from "sonner";

export function registerStoreSubscriptions() {
    useVideoDetailStore.subscribe((state, prevState) => {
        const idChanged = state.video?.id !== prevState.video?.id;
        const startedProcessing =
            !prevState.video?.status.startsWith("PROCESSANDO") &&
            state.video?.status.startsWith("PROCESSANDO");


        const finishedProcessing =
            prevState.video?.status.startsWith("PROCESSANDO") &&
            state.video?.status === "PROCESSADO";

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

        if (finishedProcessing) {
            toast.success("Reprocessamento concluído")
        }
    });
}