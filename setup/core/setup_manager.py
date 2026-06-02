import sys
import shutil
import threading
from typing import Callable

from config import ROOT, REQUIREMENTS, FRONTEND_DIR
from utils.env_utils import find_venv_python, venv_python, get_installed_package_version, torch_torchvision_compatible
from core.process_manager import ProcessManager

class SetupManager:
    """Gerencia a rotina de instalação e configuração do ambiente."""

    def __init__(self, process_manager: ProcessManager, log_callback: Callable[[str], None], state_callback: Callable[[bool, str], None]):
        self.pm = process_manager
        self.log = log_callback
        self.set_state = state_callback
        self.is_running = False

    def run_setup(self, install_ai: bool = False) -> None:
        """Inicia o fluxo de setup em uma thread separada."""
        if self.is_running:
            self.log("[setup] setup environment is already running.")
            return

        def worker() -> None:
            self.is_running = True
            try:
                self.set_state(True, "Checking .venv...")
                venv_dir = ROOT / ".venv"
                venv_python_path = find_venv_python(venv_dir)
                venv_cfg_path = venv_dir / "pyvenv.cfg"
                broken = venv_python_path is None or not venv_cfg_path.exists()
                
                if broken:
                    if venv_dir.exists():
                        shutil.rmtree(venv_dir, ignore_errors=True)
                    self.set_state(True, "Creating .venv...")
                    rc = self.pm.run_sync("setup", [sys.executable, "-m", "venv", ".venv"], ROOT)
                    if rc != 0:
                        raise RuntimeError("Failed creating .venv")
                
                py = venv_python()

                self.set_state(True, "Upgrading pip...")
                if self.pm.run_sync("setup", [str(py), "-m", "pip", "install", "--upgrade", "pip"], ROOT) != 0:
                    raise RuntimeError("Failed upgrading pip")

                self.set_state(True, "Installing build dependencies...")
                self.pm.run_sync("setup", [str(py), "-m", "pip", "install", "setuptools==68.0.0", "wheel"], ROOT)

                self.set_state(True, "Installing backend deps...")
                if self.pm.run_sync("setup", [str(py), "-m", "pip", "install", "-r", str(REQUIREMENTS)], ROOT) != 0:
                    raise RuntimeError("Failed installing backend deps")
                
                if install_ai:
                    self.set_state(True, "Installing AI packages (this may take a while)...")
                    self.log("[setup] installing heavier AI dependencies from ai-requirements.txt...")
                    
                    # Defina o caminho do seu ai-requirements.txt (ajuste conforme seu config.py)
                    ai_req_path = ROOT / "demoviefy-backend" / "ai-requirements.txt" 
                    
                    if self.pm.run_sync("setup", [str(py), "-m", "pip", "install", "-r", str(ai_req_path)], ROOT) != 0:
                        raise RuntimeError("Failed installing AI dependencies")
                else:
                    self.log("[setup] skipping AI packages installation as requested.")

                torch_ver = get_installed_package_version(py, "torch")
                torchvision_ver = get_installed_package_version(py, "torchvision")
                if not torch_torchvision_compatible(torch_ver, torchvision_ver):
                    self.log(f"[setup] warning: torch {torch_ver} + torchvision {torchvision_ver} may be incompatible.")

                self.set_state(True, "Installing frontend npm packages...")
                if self.pm.run_sync("setup", ["npm", "install"], FRONTEND_DIR) != 0:
                    raise RuntimeError("Failed npm install")
                
                self.set_state(True, "Downloading AI models (Google Drive)...")
                self.log("[setup] starting AI models download script...")
                script_path = ROOT / "setup" / "utils" / "ai_models_utils.py"

                rc_models = self.pm.run_sync(
                    "setup", 
                    [str(py), str(script_path)], 
                    ROOT
                )

                if rc_models != 0:
                    self.log("[setup] warning: AI models download script returned an error.")

                self.log("[setup] environment setup completed successfully.")
                self.set_state(False, "Ready")
                
            except Exception as e:
                self.log(f"[setup] Error: {str(e)}")
                self.set_state(False, "Setup failed")
            finally:
                self.is_running = False

        threading.Thread(target=worker, daemon=True).start()