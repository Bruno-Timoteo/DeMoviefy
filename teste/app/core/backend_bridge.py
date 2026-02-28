import sys
from pathlib import Path


def ensure_backend_on_path() -> Path:
    """
    Put demoviefy-backend at the front of sys.path so imports like
    `app.services.*` resolve to backend package (not teste/app/app.py).
    """
    repo_root = Path(__file__).resolve().parents[3]
    backend_root = repo_root / "demoviefy-backend"

    backend_root_str = str(backend_root)
    if backend_root_str in sys.path:
        sys.path.remove(backend_root_str)
    sys.path.insert(0, backend_root_str)

    return backend_root
