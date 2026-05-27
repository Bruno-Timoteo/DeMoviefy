import os
import shutil
from pathlib import Path


def resolve_npm_executable() -> str:
    primary = shutil.which("npm")

    if primary:
        return primary

    candidates: list[str | None] = [
        shutil.which("npm.cmd")
    ]

    if os.name == "nt":
        program_files = os.environ.get(
            "ProgramFiles",
            r"C:\Program Files",
        )

        program_files_x86 = os.environ.get(
            "ProgramFiles(x86)",
            r"C:\Program Files (x86)",
        )

        candidates.extend(
            [
                str(Path(program_files) / "nodejs" / "npm.cmd"),
                str(Path(program_files_x86) / "nodejs" / "npm.cmd"),
            ]
        )

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate

    raise FileNotFoundError(
        "npm executable not found."
    )


def normalize_command(command: list[str]) -> list[str]:
    if not command:
        return command

    executable = command[0].lower()

    if executable == "npm" and os.name == "nt":
        return [resolve_npm_executable(), *command[1:]]

    return command


def is_npm_command(command: list[str]) -> bool:
    if not command:
        return False

    executable = Path(command[0]).name.lower()

    return executable in {
        "npm",
        "npm.cmd",
        "npm.exe",
    }