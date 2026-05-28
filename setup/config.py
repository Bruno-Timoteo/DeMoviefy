from pathlib import Path

# Paths em nível de repositório
ROOT = Path(__file__).resolve().parent.parent
AI_MODEL_FOLDER = ROOT / "ai_model"
BACKEND_DIR = ROOT / "demoviefy-backend"
FRONTEND_DIR = ROOT / "demoviefy-frontend"
TEST_APP = ROOT / "ai_model" / "app" / "app.py"
REQUIREMENTS = ROOT / "demoviefy-backend" / "requirements.txt"
TRANSCRIPTION_REQUIREMENTS = ROOT / "demoviefy-backend" / "requirements-transcription.txt"

# Configurações do Launcher
LAUNCHER_VERSION = "1.2.0"

# Configurações do FFmpeg
FFMPEG_DIR = ROOT / ".ffmpeg"
FFMPEG_BIN_DIR = FFMPEG_DIR / "bin"
FFMPEG_DOWNLOAD_URL_WIN = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

print(ROOT)