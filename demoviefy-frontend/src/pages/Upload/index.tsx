import { CompatibilityGate } from "src/components/CompatibilityGate";
import VideoDashboard from "src/pages/Upload/components/VideoDashboard";

export default function Upload() {
  return (
    <CompatibilityGate>
      <VideoDashboard />
    </CompatibilityGate>
  );
}
