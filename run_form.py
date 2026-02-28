"""
DeMoviefy GUI launcher.

Purpose:
- Give one intuitive form to run backend, frontend, and AI test.
- Avoid manual multi-terminal setup every time.
- Stream logs in one place.
"""

import os
import queue
import shutil
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import ttk


# Repository-level paths used by launcher actions.
ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "demoviefy-backend"
FRONTEND_DIR = ROOT / "demoviefy-front"
TEST_APP = ROOT / "teste" / "app" / "app.py"
REQUIREMENTS = ROOT / "demoviefy-backend" / "requirements.txt"
LAUNCHER_VERSION = "1.2.0"


def venv_python() -> Path:
    """Return the python executable inside the shared repo virtual environment."""
    return ROOT / ".venv" / "Scripts" / "python.exe"


def resolve_npm_executable() -> str:
    """
    Resolve npm executable robustly on Windows.

    Why:
    - Some Python environments do not inherit shell aliases/functions.
    - On Windows, npm is often `npm.cmd`, not plain `npm.exe`.
    """
    candidates: list[str | None] = [
        shutil.which("npm"),
        shutil.which("npm.cmd"),
    ]

    # Common Node install locations on Windows.
    program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
    program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
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
        "npm executable not found. Install Node.js and ensure npm is available in PATH."
    )


def normalize_command(command: list[str]) -> list[str]:
    """
    Normalize command executable before running.

    Currently we special-case npm because it is the source of most launcher failures
    on Windows.
    """
    if not command:
        return command

    executable = command[0].lower()
    if executable == "npm":
        command = [resolve_npm_executable(), *command[1:]]

    return command


def is_npm_command(command: list[str]) -> bool:
    """Return True if command seems to target npm."""
    if not command:
        return False
    executable = Path(command[0]).name.lower()
    return executable in {"npm", "npm.cmd", "npm.exe"}


class LauncherForm(tk.Tk):
    """Main Tkinter form with controls and integrated logs."""

    def __init__(self) -> None:
        super().__init__()
        self.title("DeMoviefy Launcher")
        self.geometry("980x700")

        # Keep active long-running processes so we can stop/restart safely.
        self.processes: dict[str, subprocess.Popen] = {}

        # Thread-safe queue for logs coming from worker threads/process readers.
        self.log_queue: queue.Queue[str] = queue.Queue()

        # UI state vars.
        self.video_path_var = tk.StringVar(value="")
        self.backend_status_var = tk.StringVar(value="Stopped")
        self.frontend_status_var = tk.StringVar(value="Stopped")

        self._build_ui()
        self._log(f"[launcher] DeMoviefy Launcher v{LAUNCHER_VERSION}")
        self._log(f"[launcher] root={ROOT}")
        self.after(100, self._drain_log_queue)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_ui(self) -> None:
        """Construct all form widgets."""
        controls = ttk.Frame(self, padding=12)
        controls.pack(fill=tk.X)

        # Row 1: main project controls.
        row1 = ttk.Frame(controls)
        row1.pack(fill=tk.X, pady=(0, 8))

        ttk.Button(row1, text="Setup Environment", command=self.setup_environment).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Start Backend", command=self.start_backend).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Start Frontend", command=self.start_frontend).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Start All", command=self.start_all).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Stop All", command=self.stop_all).pack(side=tk.LEFT, padx=(0, 8))

        # Row 2: optional explicit video path for AI test app.
        row2 = ttk.Frame(controls)
        row2.pack(fill=tk.X, pady=(0, 8))

        ttk.Label(row2, text="AI Test Video (optional):").pack(side=tk.LEFT)
        ttk.Entry(row2, textvariable=self.video_path_var, width=60).pack(side=tk.LEFT, padx=(8, 8))
        ttk.Button(row2, text="Run AI Test", command=self.run_test_ai).pack(side=tk.LEFT)

        # Row 3: service statuses.
        status_row = ttk.Frame(controls)
        status_row.pack(fill=tk.X)
        ttk.Label(status_row, text="Backend:").pack(side=tk.LEFT)
        ttk.Label(status_row, textvariable=self.backend_status_var).pack(side=tk.LEFT, padx=(4, 16))
        ttk.Label(status_row, text="Frontend:").pack(side=tk.LEFT)
        ttk.Label(status_row, textvariable=self.frontend_status_var).pack(side=tk.LEFT, padx=(4, 0))

        # Bottom: shared log panel.
        log_frame = ttk.Frame(self, padding=(12, 0, 12, 12))
        log_frame.pack(fill=tk.BOTH, expand=True)

        self.log_text = tk.Text(log_frame, wrap=tk.NONE, height=30)
        y_scroll = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.log_text.yview)
        x_scroll = ttk.Scrollbar(log_frame, orient=tk.HORIZONTAL, command=self.log_text.xview)
        self.log_text.configure(yscrollcommand=y_scroll.set, xscrollcommand=x_scroll.set)

        self.log_text.grid(row=0, column=0, sticky="nsew")
        y_scroll.grid(row=0, column=1, sticky="ns")
        x_scroll.grid(row=1, column=0, sticky="ew")
        log_frame.rowconfigure(0, weight=1)
        log_frame.columnconfigure(0, weight=1)

    def _log(self, message: str) -> None:
        """Push a log line to the UI queue and mirror it to terminal."""
        self.log_queue.put(message)
        try:
            print(message, flush=True)
        except UnicodeEncodeError:
            safe = message.encode("utf-8", errors="replace").decode("utf-8", errors="replace")
            print(safe, flush=True)

    def _drain_log_queue(self) -> None:
        """Move queued logs into the text box (main/UI thread only)."""
        while True:
            try:
                line = self.log_queue.get_nowait()
            except queue.Empty:
                break
            self.log_text.insert(tk.END, line + "\n")
            self.log_text.see(tk.END)

        self._refresh_status()
        self.after(100, self._drain_log_queue)

    def _refresh_status(self) -> None:
        """Refresh backend/frontend running status labels."""
        self.backend_status_var.set("Running" if self._is_running("backend") else "Stopped")
        self.frontend_status_var.set("Running" if self._is_running("frontend") else "Stopped")

    def _is_running(self, name: str) -> bool:
        """Check whether a named managed process is alive."""
        proc = self.processes.get(name)
        return proc is not None and proc.poll() is None

    def _stream_process(self, name: str, proc: subprocess.Popen) -> None:
        """Read a long-running process output and route lines into the UI log queue."""
        assert proc.stdout is not None
        for raw_line in proc.stdout:
            self._log(f"[{name}] {raw_line.rstrip()}")
        code = proc.wait()
        self._log(f"[{name}] exited with code {code}")
        if self.processes.get(name) is proc:
            del self.processes[name]

    def _start_long_process(
        self,
        name: str,
        command: list[str],
        cwd: Path,
        env: dict[str, str] | None = None,
    ) -> None:
        """
        Start and track long-running services (backend/frontend).

        Output is streamed continuously.
        """
        if self._is_running(name):
            self._log(f"[launcher] {name} is already running.")
            return

        command = normalize_command(command)
        self._log(f"[launcher] starting {name}: {' '.join(command)} (cwd={cwd})")
        try:
            proc = subprocess.Popen(
                command,
                cwd=str(cwd),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
        except FileNotFoundError as exc:
            # Fallback for stricter Windows shells when invoking npm-based commands.
            if is_npm_command(command):
                command_shell = " ".join(command)
                self._log(f"[launcher] npm direct start failed, retrying via shell: {command_shell}")
                try:
                    proc = subprocess.Popen(
                        command_shell,
                        cwd=str(cwd),
                        env=env,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        encoding="utf-8",
                        errors="replace",
                        shell=True,
                    )
                except Exception as shell_exc:
                    self._log(f"[launcher] failed to start {name}: {shell_exc}")
                    return
            else:
                self._log(f"[launcher] failed to start {name}: {exc}")
                self._log("[launcher] command not found. Verify Python/Node/npm installation.")
                return
        except Exception as exc:
            self._log(f"[launcher] failed to start {name}: {exc}")
            return

        self.processes[name] = proc
        threading.Thread(target=self._stream_process, args=(name, proc), daemon=True).start()

    def _run_one_shot(
        self,
        name: str,
        command: list[str],
        cwd: Path,
        env: dict[str, str] | None = None,
    ) -> None:
        """
        Run a command once in background (used for AI test).
        """

        def worker() -> None:
            command_norm = normalize_command(command)
            self._log(f"[launcher] running {name}: {' '.join(command_norm)} (cwd={cwd})")
            try:
                proc = subprocess.Popen(
                    command_norm,
                    cwd=str(cwd),
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                )
            except FileNotFoundError as exc:
                if is_npm_command(command_norm):
                    command_shell = " ".join(command_norm)
                    self._log(f"[launcher] npm one-shot failed, retrying via shell: {command_shell}")
                    try:
                        proc = subprocess.Popen(
                            command_shell,
                            cwd=str(cwd),
                            env=env,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            encoding="utf-8",
                            errors="replace",
                            shell=True,
                        )
                    except Exception as shell_exc:
                        self._log(f"[launcher] failed to run {name}: {shell_exc}")
                        return
                else:
                    self._log(f"[launcher] failed to run {name}: {exc}")
                    self._log("[launcher] command not found. Verify Python/Node/npm installation.")
                    return
            except Exception as exc:
                self._log(f"[launcher] failed to run {name}: {exc}")
                return

            assert proc.stdout is not None
            for raw_line in proc.stdout:
                self._log(f"[{name}] {raw_line.rstrip()}")
            code = proc.wait()
            self._log(f"[{name}] completed with code {code}")

        threading.Thread(target=worker, daemon=True).start()

    def setup_environment(self) -> None:
        """
        Prepare shared environment:
        - Create .venv if missing
        - Upgrade pip
        - Install backend Python deps
        - Install frontend npm deps
        """

        def worker() -> None:
            py = venv_python()

            # Step 1: create venv if needed.
            if not py.exists():
                rc = self._run_sync("setup", [sys.executable, "-m", "venv", ".venv"], ROOT)
                if rc != 0:
                    self._log("[setup] failed while creating .venv.")
                    return

            # Step 2: install Python dependencies.
            rc = self._run_sync("setup", [str(py), "-m", "pip", "install", "--upgrade", "pip"], ROOT)
            if rc != 0:
                self._log("[setup] failed while upgrading pip.")
                return

            rc = self._run_sync("setup", [str(py), "-m", "pip", "install", "-r", str(REQUIREMENTS)], ROOT)
            if rc != 0:
                self._log("[setup] failed while installing backend requirements.")
                return

            # Step 3: install frontend dependencies.
            rc = self._run_sync("setup", ["npm", "install"], FRONTEND_DIR)
            if rc != 0:
                self._log("[setup] failed while running npm install.")
                return

            self._log("[setup] environment ready.")

        threading.Thread(target=worker, daemon=True).start()

    def _run_sync(self, name: str, command: list[str], cwd: Path) -> int:
        """
        Run a blocking command and stream output.

        Returns process exit code. Returns 127 when executable is not found.
        """
        command_norm = normalize_command(command)
        self._log(f"[{name}] {' '.join(command_norm)} (cwd={cwd})")

        try:
            proc = subprocess.Popen(
                command_norm,
                cwd=str(cwd),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
        except FileNotFoundError as exc:
            if is_npm_command(command_norm):
                # Fallback for environments where direct npm execution fails.
                command_shell = " ".join(command_norm)
                self._log(f"[{name}] npm direct execution failed, retrying via shell: {command_shell}")
                try:
                    proc = subprocess.Popen(
                        command_shell,
                        cwd=str(cwd),
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        encoding="utf-8",
                        errors="replace",
                        shell=True,
                    )
                except Exception as shell_exc:
                    self._log(f"[{name}] npm shell fallback failed: {shell_exc}")
                    return 127
            else:
                self._log(f"[{name}] command not found: {exc}")
                return 127
        except Exception as exc:
            self._log(f"[{name}] failed to start command: {exc}")
            return 1

        assert proc.stdout is not None
        for raw_line in proc.stdout:
            self._log(f"[{name}] {raw_line.rstrip()}")
        code = proc.wait()
        self._log(f"[{name}] step exited with code {code}")
        return code

    def start_backend(self) -> None:
        """Start Flask backend service."""
        py = venv_python()
        if not py.exists():
            self._log("[launcher] .venv not found. Run Setup Environment first.")
            return
        self._start_long_process("backend", [str(py), "run.py"], BACKEND_DIR)

    def start_frontend(self) -> None:
        """Start React/Vite frontend service."""
        self._start_long_process("frontend", ["npm", "run", "dev"], FRONTEND_DIR)

    def start_all(self) -> None:
        """Start backend and frontend together."""
        self.start_backend()
        self.start_frontend()

    def stop_all(self) -> None:
        """Stop every managed long-running process."""
        for name, proc in list(self.processes.items()):
            if proc.poll() is None:
                self._log(f"[launcher] stopping {name}")
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self._log(f"[launcher] killing {name}")
                    proc.kill()
        self.processes.clear()
        self._refresh_status()

    def run_test_ai(self) -> None:
        """
        Run one-shot AI test app.

        If video path field is set, pass TEST_VIDEO_PATH into subprocess env.
        """
        py = venv_python()
        if not py.exists():
            self._log("[launcher] .venv not found. Run Setup Environment first.")
            return

        env = os.environ.copy()
        raw = self.video_path_var.get().strip()
        if raw:
            env["TEST_VIDEO_PATH"] = raw
            self._log(f"[launcher] TEST_VIDEO_PATH={raw}")
        else:
            env.pop("TEST_VIDEO_PATH", None)

        self._run_one_shot("test-ai", [str(py), str(TEST_APP)], ROOT, env=env)

    def _on_close(self) -> None:
        """Ensure child processes are stopped before closing window."""
        self.stop_all()
        self.destroy()


def main() -> None:
    """Program entrypoint."""
    app = LauncherForm()
    app.mainloop()


if __name__ == "__main__":
    main()
