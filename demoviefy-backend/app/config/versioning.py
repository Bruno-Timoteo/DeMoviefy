BACKEND_APP_VERSION = "1.3.0"
API_CONTRACT_VERSION = "2026-03-22.1"


def build_version_payload() -> dict[str, str]:
    return {
        "backend_app_version": BACKEND_APP_VERSION,
        "api_contract_version": API_CONTRACT_VERSION,
    }
