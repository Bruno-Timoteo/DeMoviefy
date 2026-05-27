import os
import sys
from pathlib import Path


def venv_python_candidates(venv_dir: Path) -> list[Path]:
    if os.name == "nt":
        return [venv_dir / "Scripts" / "python.exe"]

    return [
        venv_dir / "bin" / "python",
        venv_dir / "bin" / "python3",
    ]


def find_venv_python(venv_dir: Path) -> Path | None:
    for candidate in venv_python_candidates(venv_dir):
        if candidate.exists():
            return candidate

    return None


def venv_python(root: Path) -> Path:
    venv_path = find_venv_python(root / ".venv")

    if venv_path:
        return venv_path

    return Path(sys.executable)