// src/components/CompatibilityGate.tsx
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useCompatibility } from "src/core/hooks/useCompatibility";
import { CompatibilityBanner } from "src/core/components/CompatibilityBanner";

interface CompatibilityGateProps {
  children: ReactNode;
}

export function CompatibilityGate({ children }: CompatibilityGateProps) {
  const initializedRef = useRef(false);
  const { compatibility, checkBackendCompatibility } = useCompatibility();

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void checkBackendCompatibility();
  }, [checkBackendCompatibility]);

  const handleRetry = useCallback(() => {
    void checkBackendCompatibility();
  }, [checkBackendCompatibility]);

  if (compatibility.status !== "compatible") {
    return (
      <CompatibilityBanner
        status={compatibility.status}
        message={compatibility.message}
        backendInfo={compatibility.backendInfo}
        onRetry={handleRetry}
      />
    );
  }

  return <>{children}</>;
}