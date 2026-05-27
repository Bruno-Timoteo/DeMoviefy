import os


def sanitize_env(env: dict[str, str] | None = None) -> dict[str, str]:
    env = env.copy() if env else os.environ.copy()

    for key in list(env.keys()):
        if (
            key.startswith("PYDEVD_")
            or key.startswith("DEBUGPY_")
            or key.startswith("PYTHONBREAKPOINT")
        ):
            env.pop(key, None)

    return env


def apply_proxy_env(
    env: dict[str, str],
    proxy: str | None,
) -> dict[str, str]:
    if not proxy:
        return env

    env["HTTP_PROXY"] = proxy
    env["HTTPS_PROXY"] = proxy
    env["ALL_PROXY"] = proxy

    env["http_proxy"] = proxy
    env["https_proxy"] = proxy
    env["all_proxy"] = proxy

    env["PIP_PROXY"] = proxy

    return env