# DeMoviefy - Run Instructions

These steps run backend, frontend, and the YOLO test app with one shared Python environment.

## Quick Start (GUI form)

From repo root:

```powershell
python run_form.py
```

Then click:
- `Setup Environment`
- `Start All`
- `Run AI Test` (optional)

## Proxy install (school network)

Set the proxy once per session:

```powershell
$env:PROXY_URL="http://proxy.spo.ifsp.edu.br:3128"
```

Then click `Setup Environment` in the launcher.

## Prerequisites

- Python 3.11+ (recommended)
- Node.js 20+ and npm
- FFmpeg installed and available in PATH (required for future video/audio processing)

Check versions:

```powershell
python --version
node --version
npm --version
ffmpeg -version
```

## 0) Create one shared Python venv (repo root)

From repo root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r demoviefy-backend/requirements.txt
```

Optional (only if you need transcription features):

```powershell
pip install -r demoviefy-backend/requirements-transcription.txt
```

## 1) Start Backend (Terminal 1)

From repo root:

```powershell
cd demoviefy-backend
..\.venv\Scripts\Activate.ps1
python run.py
```

Backend runs at:

- http://127.0.0.1:5000

## 2) Start Frontend (Terminal 2)

From repo root:

```powershell
cd demoviefy-front
npm install
npm run dev
```

Frontend (Vite) usually runs at:

- http://localhost:5173

## 3) Run YOLO test app (optional)

From repo root:

```powershell
.\.venv\Scripts\Activate.ps1
python ai_model/app/app.py
```

## 4) Verify Integration

- Open `http://localhost:5173`
- Go to Upload page and send a video file
- Frontend calls backend at `http://127.0.0.1:5000` (configured in `demoviefy-front/src/services/api.ts`)

## Troubleshooting

- If backend fails due to PowerShell script policy:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate venv again:

```powershell
.\.venv\Scripts\Activate.ps1
```

- If `npm install` fails with peer dependency conflicts, run:

```powershell
npm install
```

(the current frontend dependencies are already aligned for a normal install).
