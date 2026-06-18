// src/pages/Upload/hooks/useAnalysis.ts
import { useEffect, useRef } from "react";
import { VideoService } from "../services/videoService";
import { useWorkbenchStore } from "../../../store/useWorkbenchStore";
import type { VideoRecord } from "../types";
import { prettifyJson, buildArtifactSignature } from "../utils/helpers";

export function useAnalysis(
  selectedVideo: VideoRecord | null,
  fetchTranscription: (video: VideoRecord) => Promise<void>
) {
  const [analysis, setAnalysis] = useState<VideoAnalysisResponse | null>(null)
  const [selectedAnalysisVariantId, setSelectedAnalysisVariantId] = useState<string | null>(null)
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle")
  const [analysisDraft, setAnalysisDraft] = useState("{}")
  const lastArtifactSignatureRef = useRef("")

  // Reset do variant ID quando troca de vídeo
  useEffect(() => {
    useWorkbenchStore.getState().setSelectedAnalysisVariantId(null);
  }, [selectedVideo?.id]);

  useEffect(() => {
    // Puxando os setters do estado global sem atrelá-los como dependência reativa
    const {
      setAnalysis,
      setSelectedAnalysisVariantId,
      setAnalysisState,
      setAnalysisDraft,
    } = useWorkbenchStore.getState();

    if (!selectedVideo) {
      setAnalysis(null);
      setSelectedAnalysisVariantId(null);
      setAnalysisState("idle");
      setAnalysisDraft("{}");
      lastArtifactSignatureRef.current = "";
      return;
    }

    const currentSignature = buildArtifactSignature(selectedVideo, selectedAnalysisVariantId);
    if (lastArtifactSignatureRef.current === currentSignature) return;
    lastArtifactSignatureRef.current = currentSignature;

    let cancelled = false;

    const fetchArtifacts = async () => {
      setAnalysisState("loading");
      try {
        const { data: normalizedVideoAnalysis, status } = await VideoService.getNormalizedVideoAnalysis(
          selectedVideo.analysis_url,
          selectedAnalysisVariantId
        );
        if (cancelled) return;

        setAnalysis(normalizedVideoAnalysis);
        if (
          normalizedVideoAnalysis?.selected_variant_id &&
          normalizedVideoAnalysis.selected_variant_id !== selectedAnalysisVariantId
        ) {
          setSelectedAnalysisVariantId(normalizedVideoAnalysis.selected_variant_id);
        }
        setAnalysisDraft(prettifyJson(normalizedVideoAnalysis?.analysis ?? {}));
        setAnalysisState(status === 200 ? "ready" : status === 202 ? "pending" : "error");
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setAnalysis(null);
          setAnalysisDraft("{}");
          setAnalysisState("error");
        }
      }

      if (!cancelled) await fetchTranscription(selectedVideo);
    };

    void fetchArtifacts();
    return () => { cancelled = true; };
  }, [selectedVideo, selectedAnalysisVariantId, fetchTranscription]);

  // Agora ele expõe apenas o resetter, pois os estados já estão no Zustand
  return {
    resetArtifactSignature: () => { lastArtifactSignatureRef.current = ""; },
  };
}