import { memo } from "react"
import { formatVariantLabel } from "src/pages/Upload/utils/helpers"
import type { VideoAnalysisResponse } from "src/pages/Upload/types"

type AnalysisHeaderProps = {
  message: string
  variants: NonNullable<VideoAnalysisResponse["available_variants"]>
  selectedVariantId: string | null
  onVariantChange: (variantId: string | null) => void
}

export const AnalysisHeader = memo(function AnalysisHeader({
  message,
  variants,
  selectedVariantId,
  onVariantChange,
}: AnalysisHeaderProps) {
  return (
    <div className="analysis-state">
      <span className="eyebrow">Resumo</span>
      <p>{message}</p>
      {variants.length > 0 && (
        <label className="field-block">
          <span>Versão da análise</span>
          <select
            value={selectedVariantId ?? ""}
            onChange={(e) => onVariantChange(e.target.value || null)}
          >
            {variants.map((variant) => (
              <option key={variant.variant_id} value={variant.variant_id}>
                {formatVariantLabel(variant)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
})