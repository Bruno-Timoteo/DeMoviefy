import subprocess
import threading
import time
import os

from pathlib import Path

from launcher.services.env_service import (
    sanitize_env,
    apply_proxy_env,
)

from launcher.services.npm_service import (
    normalize_command,
    is_npm_command,
)

from launcher.constants import FFMPEG_BIN_DIR


class ProcessManager:
    def __init__(self, logger, proxy_url=None):
        self.logger = logger
        self.proxy_url = proxy_url
        self.processes: dict[str, subprocess.Popen] = {}

    def _log(self, msg: str):
        self.logger(msg)

    def prepare_env(
        self,
        env: dict[str, str] | None = None,
    ):
        base = env.copy() if env else os.environ.copy()

        base = apply_proxy_env(base, self.proxy_url)

        if FFMPEG_BIN_DIR.exists():
            path = base.get("PATH", "")
            ffmpeg_path = str(FFMPEG_BIN_DIR)

            if ffmpeg_path not in path.split(os.pathsep):
                base["PATH"] = (
                    ffmpeg_path + os.pathsep + path
                )

        return sanitize_env(base)

    def is_running(self, name: str) -> bool:
        proc = self.processes.get(name)

        return proc is not None and proc.poll() is None

    def stream_process(
        self,
        name: str,
        proc: subprocess.Popen,
    ):
        assert proc.stdout is not None

        for raw_line in proc.stdout:
            self._log(f"[{name}] {raw_line.rstrip()}")

        code = proc.wait()

        self._log(f"[{name}] exited with code {code}")

        if self.processes.get(name) is proc:
            del self.processes[name]

    def start_long_process(
        self,
        name: str,
        command: list[str],
        cwd: Path,
        env: dict[str, str] | None = None,
    ):
        if self.is_running(name):
            self._log(f"{name} already running")
            return

        command = normalize_command(command)

        proc = subprocess.Popen(
            command,
            cwd=str(cwd),
            env=self.prepare_env(env),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )

        self.processes[name] = proc

        threading.Thread(
            target=self.stream_process,
            args=(name, proc),
            daemon=True,
        ).start()

    def run_sync(
        self,
        name: str,
        command: list[str],
        cwd: Path,
        env=None,
    ) -> int:
        start = time.monotonic()

        command = normalize_command(command)

        self._log(f"[{name}] {' '.join(command)}")

        proc = subprocess.Popen(
            command,
            cwd=str(cwd),
            env=self.prepare_env(env),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )

        assert proc.stdout is not None

        for raw_line in proc.stdout:
            self._log(f"[{name}] {raw_line.rstrip()}")

        code = proc.wait()

        duration = time.monotonic() - start

        self._log(
            f"[{name}] exited={code} "
            f"duration={duration:.1f}s"
        )

        return code

    def stop_all(self):
        for name, proc in list(self.processes.items()):
            if proc.poll() is None:
                self._log(f"stopping {name}")

                proc.terminate()

                try:
                    proc.wait(timeout=5)

                except subprocess.TimeoutExpired:
                    proc.kill()

        self.processes.clear()