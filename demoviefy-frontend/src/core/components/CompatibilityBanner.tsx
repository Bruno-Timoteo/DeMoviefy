// src/pages/Upload/components/CompatibilityBanner.tsx

import { CompatibilityService } from "src/core/services/compatibilityService";
import type { BackendVersionResponse } from "src/core/types/compatibility";

type CompatibilityStatus = "checking" | "compatible" | "mismatch" | "unavailable"

interface CompatibilityBannerProps {
  status: CompatibilityStatus
  message: string
  backendInfo: BackendVersionResponse | null
  onRetry: () => void
}

export function CompatibilityBanner({ status, message, backendInfo, onRetry }: CompatibilityBannerProps) {
  const { frontendAppVersion, frontendApiContractVersion } = CompatibilityService.getVersionInfo()

  return (
    <div className="workspace">
      <section className={`surface compatibility-banner is-${status}`}>
        <div>
          <span className="eyebrow">Compatibilidade</span>
          <h2>
            {status === "checking"
              ? "Validando versões do sistema"
              : "Atualização necessária antes de usar o painel"}
          </h2>
          <p>{message}</p>
          <p className="compatibility-meta">
            Frontend {frontendAppVersion} · contrato {frontendApiContractVersion}
            {backendInfo
              ? ` · backend ${backendInfo.backend_app_version} · contrato ${backendInfo.api_contract_version}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={onRetry}
          disabled={status === "checking"}
        >
          {status === "checking" ? "Verificando..." : "Tentar novamente"}
        </button>
      </section>
    </div>
  )
}