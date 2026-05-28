import queue
import threading
import tkinter as tk
from tkinter import ttk
import traceback

from config import ROOT, LAUNCHER_VERSION, BACKEND_DIR, FRONTEND_DIR, TEST_APP
from utils.ffmpeg_utils import ffmpeg_available, ffmpeg_executable_path, download_ffmpeg
from utils.env_utils import venv_python
from core.process_manager import ProcessManager
from core.setup_manager import SetupManager


class LauncherForm(tk.Tk):
    """View: Interface principal da aplicação (Tkinter puros)."""

    def __init__(self, proxy_url: str | None = None) -> None:
        super().__init__()
        self.title("DeMoviefy Launcher")
        self.geometry("980x700")

        # Fila thread-safe para logs (a única forma segura de atualizar o Tkinter vindo de outras threads)
        self.log_queue: queue.Queue[str] = queue.Queue()
        self._closing = False

        # Injeção de dependência dos gerenciadores
        self.process_manager = ProcessManager(proxy_url, self._log)
        self.setup_manager = SetupManager(self.process_manager, self._log, self._set_setup_state)

        # Variáveis da UI
        self.video_path_var = tk.StringVar(value="")
        self.backend_status_var = tk.StringVar(value="Stopped")
        self.frontend_status_var = tk.StringVar(value="Stopped")
        self.setup_status_var = tk.StringVar(value="Idle")
        self.ffmpeg_status_var = tk.StringVar(value="Unknown")
        self.setup_detail_var = tk.StringVar(value="")

        self._build_ui()
        self._update_ffmpeg_status()
        self._log(f"[launcher] DeMoviefy Launcher v{LAUNCHER_VERSION}")
        self._log(f"[launcher] root={ROOT}")
        
        self.after(100, self._drain_log_queue)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def report_callback_exception(self, exc, val, tb) -> None:  # type: ignore
        details = "".join(traceback.format_exception(exc, val, tb)).rstrip()
        self._log("[launcher] Tkinter callback exception detected:\n" + details)

    def _build_ui(self) -> None:
        controls = ttk.Frame(self, padding=12)
        controls.pack(fill=tk.X)

        row1 = ttk.Frame(controls)
        row1.pack(fill=tk.X, pady=(0, 8))

        self.setup_button = ttk.Button(row1, text="Setup Environment", command=self.setup_manager.run_setup)
        self.setup_button.pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Install FFmpeg", command=self.install_ffmpeg).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Start Backend", command=self.start_backend).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Start Frontend", command=self.start_frontend).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Start All", command=self.start_all).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Stop All", command=self.process_manager.stop_all).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Clear Log", command=self.clear_log).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(row1, text="Copy Log", command=self.copy_log).pack(side=tk.LEFT, padx=(0, 8))

        setup_row = ttk.Frame(controls)
        setup_row.pack(fill=tk.X, pady=(0, 8))
        ttk.Label(setup_row, text="Setup:").pack(side=tk.LEFT)
        ttk.Label(setup_row, textvariable=self.setup_status_var).pack(side=tk.LEFT, padx=(4, 12))
        self.setup_progress = ttk.Progressbar(setup_row, mode="indeterminate", length=220)
        self.setup_progress.pack(side=tk.LEFT)

        ttk.Label(setup_row, text="FFmpeg:").pack(side=tk.LEFT, padx=(12, 0))
        ttk.Label(setup_row, textvariable=self.ffmpeg_status_var).pack(side=tk.LEFT, padx=(4, 12))

        row2 = ttk.Frame(controls)
        row2.pack(fill=tk.X, pady=(0, 8))
        ttk.Label(row2, text="AI Test Video (optional):").pack(side=tk.LEFT)
        ttk.Entry(row2, textvariable=self.video_path_var, width=60).pack(side=tk.LEFT, padx=(8, 8))
        ttk.Button(row2, text="Run AI Test", command=self.run_test_ai).pack(side=tk.LEFT)

        status_row = ttk.Frame(controls)
        status_row.pack(fill=tk.X)
        ttk.Label(status_row, text="Backend:").pack(side=tk.LEFT)
        self.backend_status_label = tk.Label(status_row, textvariable=self.backend_status_var, width=12, anchor=tk.W)
        self.backend_status_label.pack(side=tk.LEFT, padx=(4, 16))
        ttk.Label(status_row, text="Frontend:").pack(side=tk.LEFT)
        self.frontend_status_label = tk.Label(status_row, textvariable=self.frontend_status_var, width=12, anchor=tk.W)
        self.frontend_status_label.pack(side=tk.LEFT, padx=(4, 0))

        ttk.Label(controls, textvariable=self.setup_detail_var, foreground="#333333").pack(fill=tk.X)

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
        self.log_queue.put(message)
        try:
            print(message, flush=True)
        except UnicodeEncodeError:
            print(message.encode("utf-8", errors="replace").decode("utf-8", errors="replace"), flush=True)

    def clear_log(self) -> None:
        self.log_text.config(state=tk.NORMAL)
        self.log_text.delete("1.0", tk.END)
        self.log_text.config(state=tk.DISABLED)

    def copy_log(self) -> None:
        try:
            self.clipboard_clear()
            self.clipboard_append(self.log_text.get("1.0", tk.END))
            self._log("[launcher] log copied to clipboard")
        except tk.TclError as exc:
            self._log(f"[launcher] copy log failed: {exc}")

    def _drain_log_queue(self) -> None:
        if self._closing: return
        while True:
            try:
                line = self.log_queue.get_nowait()
                self.log_text.config(state=tk.NORMAL)
                self.log_text.insert(tk.END, line + "\n")
                self.log_text.see(tk.END)
                self.log_text.config(state=tk.DISABLED)
            except queue.Empty:
                break
        self._refresh_status()
        self.after(100, self._drain_log_queue)

    def _refresh_status(self) -> None:
        bk_running = self.process_manager.is_running("backend")
        ft_running = self.process_manager.is_running("frontend")

        self.backend_status_var.set("Running" if bk_running else "Stopped")
        self.frontend_status_var.set("Running" if ft_running else "Stopped")
        self.backend_status_label.config(fg="#009900" if bk_running else "#cc0000")
        self.frontend_status_label.config(fg="#009900" if ft_running else "#cc0000")
        self.setup_detail_var.set(f"Backend: {'running' if bk_running else 'stopped'}; Frontend: {'running' if ft_running else 'stopped'}")

    def _set_setup_state(self, running: bool, message: str) -> None:
        def apply() -> None:
            if self._closing: return
            self.setup_status_var.set(message)
            if running:
                self.setup_progress.start(10)
                self.setup_button.configure(state=tk.DISABLED)
            else:
                self.setup_progress.stop()
                self.setup_button.configure(state=tk.NORMAL)
        self.after(0, apply)

    def _update_ffmpeg_status(self) -> None:
        status = "Available" if ffmpeg_available() else "Missing"
        if status == "Available": status += f" ({ffmpeg_executable_path()})"
        self.ffmpeg_status_var.set(status)

    def install_ffmpeg(self) -> None:
        if ffmpeg_available():
            self._log("[setup] ffmpeg already present")
            return
        def worker() -> None:
            self._set_setup_state(True, "Installing FFmpeg...")
            success = download_ffmpeg()
            self._update_ffmpeg_status()
            self._set_setup_state(False, "FFmpeg ready" if success else "FFmpeg install failed")
        threading.Thread(target=worker, daemon=True).start()

    def start_backend(self) -> None:
        self.process_manager.start_service("backend", [str(venv_python()), "run.py"], BACKEND_DIR)

    def start_frontend(self) -> None:
        self.process_manager.start_service("frontend", ["npm", "run", "dev"], FRONTEND_DIR)

    def start_all(self) -> None:
        self.start_backend()
        self.start_frontend()

    def run_test_ai(self) -> None:
        cmd = [str(venv_python()), str(TEST_APP)]
        if video_arg := self.video_path_var.get().strip():
            cmd.append(video_arg)
        self.process_manager.run_oneshot("ai_test", cmd, ROOT)

    def _on_close(self) -> None:
        self._closing = True
        self.process_manager.stop_all()
        self.destroy()