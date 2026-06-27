// src/pages/Upload/hooks/useCompatibility.ts

import { useCallback, useState } from "react"
import { CompatibilityService } from "src/core/services/compatibilityService";
import type { BackendVersionResponse } from "src/core/types/compatibility"

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

    const { isCompatible, backendInfo, reason } = await CompatibilityService.checkCompatibility()

    setCompatibility({
      status: reason,
      backendInfo,
      message: reason === "compatible"
        ? `Contrato ${backendInfo?.api_contract_version} validado com sucesso.`
        : reason === "mismatch"
          ? "Frontend e backend estão em versões de contrato diferentes."
          : "Não foi possível validar a versão do backend.",
    })

    return isCompatible
  }, [])

  return { compatibility, checkBackendCompatibility }
}