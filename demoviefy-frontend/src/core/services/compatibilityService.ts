// src/services/compatibilityService.ts
import { api, frontendAppVersion, frontendApiContractVersion } from "src/core/services/api"
import type { BackendVersionResponse } from "src/core/types/compatibility";

export class CompatibilityService {
    static async getSystemVersion(): Promise<BackendVersionResponse> {
        const { data } = await api.get<BackendVersionResponse>("/system/version");
        return data;
    }

    static async checkCompatibility(): Promise<{
        isCompatible: boolean;
        backendInfo: BackendVersionResponse | null;
        reason: "compatible" | "mismatch" | "unavailable";
    }> {
        try {
            const backendInfo = await CompatibilityService.getSystemVersion();
            const isCompatible = backendInfo.api_contract_version == frontendApiContractVersion;

            return {
                isCompatible,
                backendInfo,
                reason: isCompatible ? "compatible" : "mismatch",
            };
        } catch {
            return { isCompatible: false, backendInfo: null, reason: "unavailable" };
        }
    }

    static getVersionInfo() {
        return { frontendAppVersion, frontendApiContractVersion };
    }
}