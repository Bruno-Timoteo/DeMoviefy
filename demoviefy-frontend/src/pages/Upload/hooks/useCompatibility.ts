import { useCallback, useState } from "react"
import { VideoService } from "src/pages/Upload/services/videoService"
import type { BackendVersionResponse } from "src/pages/Upload/types"

type CompatibilityState =
  | { status: "checking"; message: string; backendInfo: null }
  | { status: "compatible" | "mismatch" | "unavailable"; message: string; backendInfo: BackendVersionResponse | null }

export function useCompatibility() {
  const [compatibility, setCompatibility] = useState<CompatibilityState>({
    status: "checking",
    message: "Verificando compatibilidade entre frontend e backend.",
    backendInfo: null,
  })

  const checkBackendCompatibility = useCallback(async () => {
    setCompatibility({ status: "checking", message: "Verificando compatibilidade...", backendInfo: null })

    const { isCompatible, backendInfo, reason } = await VideoService.checkCompatibility()

    setCompatibility({
      status: reason,
      backendInfo,
      message: reason === "compatible"
        ? `Contrato ${backendInfo?.api_contract_version} validado com sucesso.`
        : reason === "mismatch"
          ? "Frontend e backend estao em versoes de contrato diferentes."
          : "Nao foi possivel validar a versao do backend.",
    })

    return isCompatible
  }, [])

  return { compatibility, checkBackendCompatibility }
}