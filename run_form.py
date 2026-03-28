"""
DeMoviefy GUI launcher.

Purpose:
- Give one intuitive form to run backend, frontend, and AI test.
- Avoid manual multi-terminal setup every time.
- Stream logs in one place.
"""

import argparse
import os
import queue
import shutil
import subprocess
import sys
import threading
import time
import traceback
import tkinter as tk
from pathlib import Path
from tkinter import ttk
import urllib.request
import zipfile
import tempfile


# Repository-level paths used by launcher actions.
ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "demoviefy-backend"
FRONTEND_DIR = ROOT / "demoviefy-front"
TEST_APP = ROOT / "ai_model" / "app" / "app.py"
REQUIREMENTS = ROOT / "demoviefy-backend" / "requirements.txt"
TRANSCRIPTION_REQUIREMENTS = ROOT / "demoviefy-backend" / "requirements-transcription.txt"
LAUNCHER_VERSION = "1.2.0"

FFMPEG_DIR = ROOT / ".ffmpeg"
FFMPEG_BIN_DIR = FFMPEG_DIR / "bin"
FFMPEG_DOWNLOAD_URL_WIN = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"


def ffmpeg_executable_path() -> Path | None:
    """Return path to ffmpeg in system PATH or local cache (if installed via launcher)."""
    for name in ("ffmpeg", "ffmpeg.exe"):
        if shutil.which(name):
            return Path(shutil.which(name))

    local = FFMPEG_BIN_DIR / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    if local.exists():
        return local
    return None


def ffmpeg_available() -> bool:
    """True when ffmpeg is available for subprocesses."""
    return ffmpeg_executable_path() is not None


def download_ffmpeg() -> bool:
    """Download and unpack ffmpeg to the local launcher cache.

    Currently Windows-only (static zip builds).
    """
    if ffmpeg_available():
        return True

    if os.name != "nt":
        return False

    try:
        FFMPEG_DIR.mkdir(parents=True, exist_ok=True)
        archive_fd, archive_path = tempfile.mkstemp(suffix=".zip")
        os.close(archive_fd)

        urllib.request.urlretrieve(FFMPEG_DOWNLOAD_URL_WIN, archive_path)

        with zipfile.ZipFile(archive_path, "r") as zf:
            members = [m for m in zf.namelist() if m.endswith("ffmpeg.exe") or m.endswith("ffprobe.exe")]
            if not members:
                return False

            for member in members:
                dest_name = Path(member).name
                target = FFMPEG_BIN_DIR / dest_name
                FFMPEG_BIN_DIR.mkdir(parents=True, exist_ok=True)
                with zf.open(member) as src, open(target, "wb") as out:
                    out.write(src.read())
                target.chmod(0o755)

        os.remove(archive_path)
        return ffmpeg_available()
    except Exception:
        return False


def venv_python_candidates(venv_dir: Path) -> list[Path]:
    """Return candidate python executables for a venv across platforms."""
    if os.name == "nt":
        return [venv_dir / "Scripts" / "python.exe"]
    return [venv_dir / "bin" / "python", venv_dir / "bin" / "python3"]


def find_venv_python(venv_dir: Path) -> Path | None:
    """Return the first existing python executable within the venv."""
    for candidate in venv_python_candidates(venv_dir):
        if candidate.exists():
            return candidate
    return None


def venv_python() -> Path:
    """Return the python executable inside the shared repo virtual environment.

    Falls back to the interpreter that was used to start the launcher if the
    venv does not exist yet.
    """
    venv_path = find_venv_python(ROOT / ".venv")
    if venv_path is not None:
        return venv_path
    return Path(sys.executable)



def resolve_npm_executable() -> str:
    """
    Resolve npm executable robustly, with Windows-specific fallbacks.

    Why:
    - Some Python environments do not inherit shell aliases/functions.
    - On Windows, npm is often `npm.cmd`, not plain `npm.exe`.
    """
    primary = shutil.which("npm")
    if primary:
        return primary

    candidates: list[str | None] = [shutil.which("npm.cmd")]

    # Common Node install locations on Windows.
    if os.name == "nt":
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
    if executable == "npm" and os.name == "nt":
        command = [resolve_npm_executable(), *command[1:]]

    return command


def is_npm_command(command: list[str]) -> bool:
    """Return True if command seems to target npm."""
    if not command:
        return False
    executable = Path(command[0]).name.lower()
    return executable in {"npm", "npm.cmd", "npm.exe"}


def sanitize_env(env: dict[str, str] | None = None) -> dict[str, str]:
    """Return a copy of *env* with debugger-related entries removed.

    When the launcher itself is executed under a debugger (VS Code, PyCharm,
    etc.) it will set various ``PYDEVD_*`` and similar environment variables
    that cause *all* child Python processes to start under the debugger.  In
    our case this leads to SQLAlchemy failing while it tries to install its
    internal symbols; the error manifests as
    ``TypeError: Can't replace canonical symbol for '__firstlineno__'``.

    We want backend/frontend subprocesses to run normally, so strip the
    common debugpy/ptvsd variables before passing the environment into
    ``subprocess.Popen``.
    """
    if env is None:
        env = os.environ.copy()
    else:
        env = env.copy()

    # remove any known debugger hooks; include both pydevd and debugpy since
    # different tools use different prefixes.
    for key in list(env.keys()):
        if key.startswith("PYDEVD_") or key.startswith("DEBUGPY_") or key.startswith("PYTHONBREAKPOINT"):
            env.pop(key, None)
    return env


def apply_proxy_env(env: dict[str, str], proxy: str | None) -> dict[str, str]:
    """Apply proxy values to both uppercase and lowercase env vars."""
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
    """Return installed package version in the venv or None if missing."""
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
    """Return True if torch and torchvision versions look compatible."""
    if not torch_ver or not torchvision_ver:
        return True

    # Simple heuristics for the present repo constraints.
    if torchvision_ver.startswith("0.26") and not torch_ver.startswith("2.11"):
        return False
    if torchvision_ver.startswith("0.27") and not torch_ver.startswith("2.12"):
        return False
    return True


class LauncherForm(tk.Tk):
    """Main Tkinter form with controls and integrated logs."""

    def __init__(self, proxy_url: str | None = None) -> None:
        super().__init__()
        self.title("DeMoviefy Launcher")
        self.geometry("980x700")

        self.proxy_url = proxy_url

        # Keep active long-running processes so we can stop/restart safely.
        self.processes: dict[str, subprocess.Popen] = {}

        # Thread-safe queue for logs coming from worker threads/process readers.
        self.log_queue: queue.Queue[str] = queue.Queue()

        # UI state vars.
        self.video_path_var = tk.StringVar(value="")
        self.backend_status_var = tk.StringVar(value="Stopped")
        self.frontend_status_var = tk.StringVar(value="Stopped")
        self.setup_status_var = tk.StringVar(value="Idle")
        self._setup_running = False
        self._closing = False

        self._build_ui()
        self._log(f"[launcher] DeMoviefy Launcher v{LAUNCHER_VERSION}")
        self._log(f"[launcher] root={ROOT}")
        self.after(100, self._drain_log_queue)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def report_callback_exception(self, exc, val, tb) -> None:  # type: ignore[override]
        """Log Tk callback failures instead of letting them disappear truncated."""
        details = "".join(traceback.format_exception(exc, val, tb)).rstrip()
        self._log("[launcher] Tkinter callback exception detected:")
        for line in details.splitlines():
            self._log(f"[launcher] {line}")

    def _build_ui(self) -> None:
        """Construct all form widgets."""
        controls = ttk.Frame(self, padding=12)
        controls.pack(fill=tk.X)

        # Row 1: main project controls.
        row1 = ttk.Frame(controls)
        row1.pack(fill=tk.X, pady=(0, 8))

        self.setup_button = ttk.Button(row1, text="Setup Environment", command=self.setup_environment)
        self.setup_button.pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Start Backend", command=self.start_backend).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Start Frontend", command=self.start_frontend).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Start All", command=self.start_all).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Stop All", command=self.stop_all).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Clear Log", command=self.clear_log).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Copy Log", command=self.copy_log).pack(side=tk.LEFT, padx=(0, 8))

        # Row 1b: setup status indicator.
        setup_row = ttk.Frame(controls)
        setup_row.pack(fill=tk.X, pady=(0, 8))
        ttk.Label(setup_row, text="Setup:").pack(side=tk.LEFT)
        ttk.Label(setup_row, textvariable=self.setup_status_var).pack(side=tk.LEFT, padx=(4, 12))
        self.setup_progress = ttk.Progressbar(setup_row, mode="indeterminate", length=220)
        self.setup_progress.pack(side=tk.LEFT)

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
        self.backend_status_label = tk.Label(status_row, textvariable=self.backend_status_var, width=12, anchor=tk.W)
        self.backend_status_label.pack(side=tk.LEFT, padx=(4, 16))
        ttk.Label(status_row, text="Frontend:").pack(side=tk.LEFT)
        self.frontend_status_label = tk.Label(status_row, textvariable=self.frontend_status_var, width=12, anchor=tk.W)
        self.frontend_status_label.pack(side=tk.LEFT, padx=(4, 0))

        # Helper status text.
        self.setup_detail_var = tk.StringVar(value="")
        ttk.Label(controls, textvariable=self.setup_detail_var, foreground="#333333").pack(fill=tk.X)

        # Bottom: shared log panel.
        log_frame = ttk.Frame(self, padding=(12, 0, 12, 12))
        log_frame.pack(fill=tk.BOTH, expand=True)

        self.log_text = tk.Text(log_frame, wrap=tk.NONE, height=30, state=tk.DISABLED)
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

    def clear_log(self) -> None:
        """Clear the on-screen log."""
        self.log_text.config(state=tk.NORMAL)
        self.log_text.delete("1.0", tk.END)
        self.log_text.config(state=tk.NORMAL)
        self._log("[launcher] log cleared")

    def copy_log(self) -> None:
        """Copy log contents to clipboard."""
        try:
            log_data = self.log_text.get("1.0", tk.END)
            self.clipboard_clear()
            self.clipboard_append(log_data)
            self._log("[launcher] log copied to clipboard")
        except tk.TclError as exc:
            self._log(f"[launcher] copy log failed: {exc}")

    def _drain_log_queue(self) -> None:
        """Move queued logs into the text box (main/UI thread only)."""
        if self._closing:
            return

        while True:
            try:
                line = self.log_queue.get_nowait()
            except queue.Empty:
                break
            try:
                self.log_text.config(state=tk.NORMAL)
                self.log_text.insert(tk.END, line + "\n")
                self.log_text.see(tk.END)
                self.log_text.config(state=tk.DISABLED)
            except tk.TclError:
                return

        try:
            self._refresh_status()
            self.after(100, self._drain_log_queue)
        except tk.TclError:
            return

    def _refresh_status(self) -> None:
        """Refresh backend/frontend running status labels."""
        backend_running = self._is_running("backend")
        frontend_running = self._is_running("frontend")

        self.backend_status_var.set("Running" if backend_running else "Stopped")
        self.frontend_status_var.set("Running" if frontend_running else "Stopped")

        self.backend_status_label.config(fg="#009900" if backend_running else "#cc0000")
        self.frontend_status_label.config(fg="#009900" if frontend_running else "#cc0000")

        self.setup_detail_var.set(
            f"Backend: {'running' if backend_running else 'stopped'}; Frontend: {'running' if frontend_running else 'stopped'}"
        )

    def _is_running(self, name: str) -> bool:
        """Check whether a named managed process is alive."""
        proc = self.processes.get(name)
        return proc is not None and proc.poll() is None

    def _set_setup_state(self, running: bool, message: str | None = None) -> None:
        """Update setup indicator safely from any thread."""

        def apply() -> None:
            if self._closing:
                return
            self._setup_running = running
            if message is not None:
                self.setup_status_var.set(message)
            if running:
                self.setup_progress.start(10)
                self.setup_button.configure(state=tk.DISABLED)
            else:
                self.setup_progress.stop()
                self.setup_button.configure(state=tk.NORMAL)

        try:
            self.after(0, apply)
        except tk.TclError:
            return

    def _stream_process(self, name: str, proc: subprocess.Popen) -> None:
        """Read a long-running process output and route lines into the UI log queue."""
        assert proc.stdout is not None
        for raw_line in proc.stdout:
            self._log(f"[{name}] {raw_line.rstrip()}")
        code = proc.wait()
        self._log(f"[{name}] exited with code {code}")
        if self.processes.get(name) is proc:
            del self.processes[name]

    def _prepare_env(self, env: dict[str, str] | None = None) -> dict[str, str]:
        """Merge proxy config and remove debugger hooks from the environment."""
        base = env.copy() if env is not None else os.environ.copy()
        base = apply_proxy_env(base, self.proxy_url)

        if FFMPEG_BIN_DIR.exists():
            path = base.get("PATH", "")
            ffmpeg_path_str = str(FFMPEG_BIN_DIR)
            if ffmpeg_path_str not in path.split(os.pathsep):
                base["PATH"] = ffmpeg_path_str + os.pathsep + path if path else ffmpeg_path_str

        return sanitize_env(base)

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
        env = self._prepare_env(env)
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
            env_prepared = self._prepare_env(env)
            self._log(f"[launcher] running {name}: {' '.join(command_norm)} (cwd={cwd})")
            try:
                proc = subprocess.Popen(
                    command_norm,
                    cwd=str(cwd),
                    env=env_prepared,
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
                            env=env_prepared,
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
        - Install setuptools and wheel (required for some packages)
        - Install backend Python deps
        - Install transcription deps (optional)
        - Install frontend npm deps
        """

        def worker() -> None:
            try:
                # ``py`` may initially be the system interpreter if the venv
                # does not exist or is corrupted.  We'll check both the python
                # executable and the pyvenv.cfg file; if either is missing we
                # consider the environment broken and recreate it.  This avoids
                # mysterious errors like "failed to locate pyvenv.cfg" when
                # someone deleted a file out from under the venv.
                # Step 1: create or repair venv.
                self._set_setup_state(True, "Checking .venv...")
                venv_dir = ROOT / ".venv"
                venv_python_path = find_venv_python(venv_dir)
                venv_cfg_path = venv_dir / "pyvenv.cfg"
                broken = venv_python_path is None or not venv_cfg_path.exists()
                if broken:
                    # if the directory partially exists, remove it so we can
                    # recreate cleanly
                    if venv_dir.exists():
                        try:
                            shutil.rmtree(venv_dir)
                        except Exception:
                            pass
                    self._set_setup_state(True, "Creating .venv...")
                    rc = self._run_sync("setup", [sys.executable, "-m", "venv", ".venv"], ROOT)
                    if rc != 0:
                        self._log("[setup] failed while creating .venv.")
                        self._set_setup_state(False, "Failed creating .venv")
                        return
                    # after creation we can point ``py`` at the new venv
                    py = venv_python()
                else:
                    py = venv_python()

                # Step 2: upgrade pip and install build dependencies
                self._set_setup_state(True, "Upgrading pip...")
                rc = self._run_sync(
                    "setup",
                    [str(py), "-m", "pip", "install", "--upgrade", "pip"],
                    ROOT,
                    env=None,
                )
                if rc != 0:
                    self._log("[setup] failed while upgrading pip.")
                    self._set_setup_state(False, "Failed upgrading pip")
                    return

                self._set_setup_state(True, "Installing build dependencies...")
                rc = self._run_sync(
                    "setup",
                    [str(py), "-m", "pip", "install", "setuptools==68.0.0", "wheel"],
                    ROOT,
                    env=None,
                )
                if rc != 0:
                    self._log("[setup] warning: failed installing setuptools/wheel (continuing anyway).")

                # Step 3: install backend Python dependencies.
                self._set_setup_state(True, "Installing backend deps...")
                rc = self._run_sync(
                    "setup",
                    [str(py), "-m", "pip", "install", "-r", str(REQUIREMENTS)],
                    ROOT,
                    env=None,
                )
                if rc != 0:
                    self._log("[setup] failed while installing backend requirements.")
                    self._set_setup_state(False, "Failed backend deps")
                    return

                # Verify torch/torchvision compatibility after backend install.
                torch_ver = get_installed_package_version(py, "torch")
                torchvision_ver = get_installed_package_version(py, "torchvision")
                if torch_ver and torchvision_ver and not torch_torchvision_compatible(torch_ver, torchvision_ver):
                    self._log(
                        f"[setup] warning: detected torch {torch_ver} + torchvision {torchvision_ver} which may be incompatible."
                    )
                    self._log("[setup] attempting to align torchvision to 0.26.0 for compatibility.")
                    rc_fix = self._run_sync(
                        "setup",
                        [str(py), "-m", "pip", "install", "torchvision==0.26.0"],
                        ROOT,
                        env=None,
                    )
                    if rc_fix != 0:
                        self._log("[setup] warning: failed to pin torchvision for compatibility. You may need manual fix.")

                # Step 4: try to install optional transcription dependencies
                if TRANSCRIPTION_REQUIREMENTS.exists():
                    self._set_setup_state(True, "Installing transcription deps...")
                    rc = self._run_sync(
                        "setup",
                        [str(py), "-m", "pip", "install", "--no-build-isolation", "-r", str(TRANSCRIPTION_REQUIREMENTS)],
                        ROOT,
                        env=None,
                    )
                    if rc != 0:
                        self._log("[setup] warning: transcription deps skipped (continuing anyway).")
                        self._log("[setup] You can manually install them later with: pip install -r demoviefy-backend/requirements-transcription.txt")
                    else:
                        self._log("[setup] transcription deps installed.")

                # Step 5: install frontend dependencies.
                self._set_setup_state(True, "Installing frontend deps...")
                rc = self._run_sync("setup", ["npm", "install"], FRONTEND_DIR, env=None)
                if rc != 0:
                    self._log("[setup] failed while running npm install.")
                    self._set_setup_state(False, "Failed frontend deps")
                    return

                self._log("[setup] environment ready.")
                self._set_setup_state(False, "Ready")
            except Exception as exc:
                self._log(f"[setup] unexpected error: {exc}")
                self._set_setup_state(False, "Failed (unexpected)")

        if self._setup_running:
            self._log("[setup] setup is already running.")
            return
        self._set_setup_state(True, "Starting...")
        threading.Thread(target=worker, daemon=True).start()

    def _run_sync(self, name: str, command: list[str], cwd: Path, env: dict[str, str] | None = None) -> int:
        """
        Run a blocking command and stream output.

        Returns process exit code. Returns 127 when executable is not found.
        """
        command_norm = normalize_command(command)
        env_prepared = self._prepare_env(env)
        self._log(f"[{name}] {' '.join(command_norm)} (cwd={cwd})")
        start_ts = time.monotonic()

        try:
            proc = subprocess.Popen(
                command_norm,
                cwd=str(cwd),
                env=env_prepared,
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
                        env=env_prepared,
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
        duration = time.monotonic() - start_ts
        self._log(f"[{name}] step exited with code {code} (duration {duration:.1f}s)")
        return code

    def start_backend(self) -> None:
        """Start Flask backend service."""
        # ``py`` may fall back to the system interpreter; instead verify that
        # the venv appears healthy before proceeding.
        venv_dir = ROOT / ".venv"
        venv_python_path = find_venv_python(venv_dir)
        venv_cfg = venv_dir / "pyvenv.cfg"
        if venv_python_path is None or not venv_cfg.exists():
            self._log("[launcher] .venv not found or broken. Run Setup Environment first.")
            return
        py = venv_python()
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
        venv_dir = ROOT / ".venv"
        venv_python_path = find_venv_python(venv_dir)
        venv_cfg = venv_dir / "pyvenv.cfg"
        if venv_python_path is None or not venv_cfg.exists():
            self._log("[launcher] .venv not found or broken. Run Setup Environment first.")
            return
        py = venv_python()

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
        self._closing = True
        self.stop_all()
        self.destroy()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse CLI arguments for the launcher."""
    default_proxy = (
        os.environ.get("PROXY_URL")
        or os.environ.get("HTTP_PROXY")
        or os.environ.get("http_proxy")
    )
    parser = argparse.ArgumentParser(description="DeMoviefy launcher")
    parser.add_argument("--proxy", help="Proxy URL for pip/npm installs and services.", default=default_proxy)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    """Program entrypoint."""
    args = parse_args(argv)
    proxy = args.proxy
    if proxy:
        os.environ["PROXY_URL"] = proxy
    app = LauncherForm(proxy_url=proxy)
    app.mainloop()


if __name__ == "__main__":
    main()
