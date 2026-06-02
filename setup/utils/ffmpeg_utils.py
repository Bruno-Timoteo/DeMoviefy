import os
import shutil
import tempfile
import urllib.request
import zipfile
import platform
import subprocess
from pathlib import Path

from config import FFMPEG_BIN_DIR, FFMPEG_DIR, FFMPEG_DOWNLOAD_URL_WIN

def ffmpeg_executable_path() -> Path | None:
    for name in ("ffmpeg", "ffmpeg.exe"):
        if shutil.which(name):
            return Path(shutil.which(name))

    local = FFMPEG_BIN_DIR / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    if local.exists():
        return local
    return None

def ffmpeg_available() -> bool:
    return ffmpeg_executable_path() is not None

def download_ffmpeg() -> bool:
    if ffmpeg_available():
        return True

    system = platform.system()
    
    if system == "Windows":
        try:
            FFMPEG_DIR.mkdir(parents=True, exist_ok=True)
            archive_fd, archive_path = tempfile.mkstemp(suffix=".zip")
            os.close(archive_fd)
            print("[setup] Downloading ffmpeg zip for Windows...")
            urllib.request.urlretrieve(FFMPEG_DOWNLOAD_URL_WIN, archive_path)
            with zipfile.ZipFile(archive_path, "r") as zf:
                members = [m for m in zf.namelist() if m.endswith("ffmpeg.exe") or m.endswith("ffprobe.exe")]
                if not members:
                    print("[setup] ffmpeg.exe not found in zip!")
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
        except Exception as exc:
            print(f"[setup] Windows ffmpeg install failed: {exc}")
            return False

    if system == "Linux":
        if shutil.which("apt"):
            try:
                print("[setup] Installing ffmpeg via apt...")
                rc = subprocess.call(["sudo", "apt", "update"])
                rc2 = subprocess.call(["sudo", "apt", "install", "-y", "ffmpeg"])
                if rc == 0 and rc2 == 0 and ffmpeg_available():
                    return True
            except Exception as exc:
                print(f"[setup] apt install failed: {exc}")
        if shutil.which("dnf"):
            try:
                print("[setup] Installing ffmpeg via dnf...")
                rc = subprocess.call(["sudo", "dnf", "install", "-y", "ffmpeg"])
                if rc == 0 and ffmpeg_available():
                    return True
            except Exception as exc:
                print(f"[setup] dnf install failed: {exc}")
        try:
            print("[setup] Downloading static ffmpeg tarball for Linux...")
            url = "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
            archive_fd, archive_path = tempfile.mkstemp(suffix=".tar.xz")
            os.close(archive_fd)
            urllib.request.urlretrieve(url, archive_path)
            import tarfile
            with tarfile.open(archive_path, "r:xz") as tf:
                members = [m for m in tf.getnames() if m.endswith("/ffmpeg") or m.endswith("/ffprobe")]
                if not members:
                    print("[setup] ffmpeg not found in tarball!")
                    return False
                for member in members:
                    dest_name = Path(member).name
                    target = FFMPEG_BIN_DIR / dest_name
                    FFMPEG_BIN_DIR.mkdir(parents=True, exist_ok=True)
                    with tf.extractfile(member) as src, open(target, "wb") as out:
                        out.write(src.read())
                    target.chmod(0o755)
            os.remove(archive_path)
            return ffmpeg_available()
        except Exception as exc:
            print(f"[setup] Linux tarball install failed: {exc}")
            return False

    if system == "Darwin":
        if shutil.which("brew"):
            try:
                print("[setup] Installing ffmpeg via brew...")
                rc = subprocess.call(["brew", "install", "ffmpeg"])
                if rc == 0 and ffmpeg_available():
                    return True
            except Exception as exc:
                print(f"[setup] brew install failed: {exc}")
        try:
            print("[setup] Please install ffmpeg manually using Homebrew: brew install ffmpeg")
            return False
        except Exception as exc:
            print(f"[setup] macOS static install failed: {exc}")
            return False

    print("[setup] Could not install ffmpeg automatically. Please install it manually.")
    return False