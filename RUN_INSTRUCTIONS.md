# DeMoviefy - Run Instructions

These steps run backend and frontend locally.

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

## 1) Start Backend (Terminal 1)

From repo root:

```powershell
cd demoviefy-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
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

## 3) Verify Integration

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
