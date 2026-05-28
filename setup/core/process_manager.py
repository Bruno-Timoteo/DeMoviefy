import os
import subprocess
import threading
from pathlib import Path
from typing import Callable, Dict

from config import FFMPEG_BIN_DIR
from utils.env_utils import normalize_command, is_npm_command, apply_proxy_env, sanitize_env

class ProcessManager:
    """Gerencia a execução e monitoramento de subprocessos da aplicação."""

    def __init__(self, proxy_url: str | None, log_callback: Callable[[str], None]):
        self.proxy_url = proxy_url
        self.log = log_callback
        self.processes: Dict[str, subprocess.Popen] = {}

    def is_running(self, name: str) -> bool:
        proc = self.processes.get(name)
        return proc is not None and proc.poll() is None

    def stop_all(self) -> None:
        """Encerra todos os processos ativos gerenciados."""
        for name in list(self.processes.keys()):
            proc = self.processes.get(name)
            if proc and proc.poll() is None:
                self.log(f"[process] stopping {name}...")
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    proc.kill()
                self.log(f"[process] {name} stopped.")

    def _prepare_env(self, env: dict[str, str] | None = None) -> dict[str, str]:
        base = env.copy() if env is not None else os.environ.copy()
        base = apply_proxy_env(base, self.proxy_url)

        if FFMPEG_BIN_DIR.exists():
            path = base.get("PATH", "")
            ffmpeg_path_str = str(FFMPEG_BIN_DIR)
            if ffmpeg_path_str not in path.split(os.pathsep):
                base["PATH"] = ffmpeg_path_str + os.pathsep + path if path else ffmpeg_path_str

        return sanitize_env(base)

    def _stream_process(self, name: str, proc: subprocess.Popen) -> None:
        assert proc.stdout is not None
        for raw_line in proc.stdout:
            self.log(f"[{name}] {raw_line.rstrip()}")
        code = proc.wait()
        self.log(f"[{name}] exited with code {code}")
        if self.processes.get(name) is proc:
            del self.processes[name]

    def start_service(self, name: str, command: list[str], cwd: Path, env: dict[str, str] | None = None) -> None:
        """Inicia um serviço de longa duração em background."""
        if self.is_running(name):
            self.log(f"[process] {name} is already running.")
            return

        command_norm = normalize_command(command)
        env_prepared = self._prepare_env(env)
        
        use_shell = is_npm_command(command_norm)
        # CORREÇÃO: Se usar shell, transforma a lista em string
        popen_args = " ".join(command_norm) if use_shell else command_norm
        
        self.log(f"[process] starting {name}: {' '.join(command_norm)}")
        
        try:
            proc = subprocess.Popen(
                popen_args,
                cwd=str(cwd),
                env=env_prepared,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                shell=use_shell
            )
            self.processes[name] = proc
            threading.Thread(target=self._stream_process, args=(name, proc), daemon=True).start()
        except Exception as exc:
            self.log(f"[process] failed to start {name}: {exc}")

    def run_oneshot(self, name: str, command: list[str], cwd: Path, env: dict[str, str] | None = None) -> None:
        """Roda um comando de curta duração assíncronamente."""
        def worker() -> None:
            self.run_sync(name, command, cwd, env)
        threading.Thread(target=worker, daemon=True).start()

    def run_sync(self, name: str, command: list[str], cwd: Path, env: dict[str, str] | None = None) -> int:
        """Roda um comando travando a thread atual (usado no setup)."""
        command_norm = normalize_command(command)
        env_prepared = self._prepare_env(env)
        
        use_shell = is_npm_command(command_norm)
        # CORREÇÃO: Se usar shell, transforma a lista em string
        popen_args = " ".join(command_norm) if use_shell else command_norm

        self.log(f"[{name}] running sync: {' '.join(command_norm)}")
        try:
            proc = subprocess.Popen(
                popen_args,
                cwd=str(cwd),
                env=env_prepared,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                shell=use_shell
            )
            assert proc.stdout is not None
            for raw_line in proc.stdout:
                self.log(f"[{name}] {raw_line.rstrip()}")
            return proc.wait()
        except Exception as exc:
            self.log(f"[{name}] execution error: {exc}")
            return -1