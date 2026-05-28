import os
import sys
import shutil
import subprocess
from pathlib import Path

from config import ROOT

def venv_python_candidates(venv_dir: Path) -> list[Path]:
    if os.name == "nt":
        return [venv_dir / "Scripts" / "python.exe"]
    return [venv_dir / "bin" / "python", venv_dir / "bin" / "python3"]

def find_venv_python(venv_dir: Path) -> Path | None:
    for candidate in venv_python_candidates(venv_dir):
        if candidate.exists():
            return candidate
    return None

def venv_python() -> Path:
    venv_path = find_venv_python(ROOT / ".venv")
    if venv_path is not None:
        return venv_path
    return Path(sys.executable)

def resolve_npm_executable() -> str:
    primary = shutil.which("npm")
    if primary:
        return primary

    candidates: list[str | None] = [shutil.which("npm.cmd")]

    if os.name == "nt":
        program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
        candidates.extend([
            str(Path(program_files) / "nodejs" / "npm.cmd"),
            str(Path(program_files_x86) / "nodejs" / "npm.cmd"),
        ])

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate

    raise FileNotFoundError("npm executable not found. Install Node.js and ensure npm is available in PATH.")

def normalize_command(command: list[str]) -> list[str]:
    if not command:
        return command

    executable = command[0].lower()
    if executable == "npm" and os.name == "nt":
        command = [resolve_npm_executable(), *command[1:]]

    return command

def is_npm_command(command: list[str]) -> bool:
    if not command:
        return False
    executable = Path(command[0]).name.lower()
    return executable in {"npm", "npm.cmd", "npm.exe"}

def sanitize_env(env: dict[str, str] | None = None) -> dict[str, str]:
    if env is None:
        env = os.environ.copy()
    else:
        env = env.copy()

    for key in list(env.keys()):
        if key.startswith("PYDEVD_") or key.startswith("DEBUGPY_") or key.startswith("PYTHONBREAKPOINT"):
            env.pop(key, None)
    return env

def apply_proxy_env(env: dict[str, str], proxy: str | None) -> dict[str, str]:
    if not proxy:
        return env
    env["HTTP_PROXY"] = proxy
    env["HTTPS_PROXY"] = proxy
    env["ALL_PROXY"] = proxy
    env["PIP_PROXY"] = proxy
    env["http_proxy"] = proxy
    env["https_proxy"] = proxy
    env["all_proxy"] = proxy
    return env

def get_installed_package_version(py: Path, package: str) -> str | None:
    try:
        proc = subprocess.run(
            [str(py), "-m", "pip", "show", package],
            capture_output=True,
            text=True,
            env=sanitize_env(),
            check=False,
        )
        if proc.returncode != 0 or not proc.stdout:
            return None
        for line in proc.stdout.splitlines():
            if line.startswith("Version:"):
                return line.split(":", 1)[1].strip()
    except Exception:
        return None
    return None

def torch_torchvision_compatible(torch_ver: str | None, torchvision_ver: str | None) -> bool:
    if not torch_ver or not torchvision_ver:
        return True
    if torchvision_ver.startswith("0.26") and not torch_ver.startswith("2.11"):
        return False
    if torchvision_ver.startswith("0.27") and not torch_ver.startswith("2.12"):
        return False
    return True