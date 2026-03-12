# DeMoviefy

## Monorepo structure

- `demoviefy-backend`: Flask API
- `demoviefy-front`: React frontend
- `ai_model`: YOLO model assets + test app (MVC)
- `docs`: project documentation

## Single Python venv for the whole repo

Run from repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r demoviefy-backend/requirements.txt
```

Optional transcription dependencies (not required for current video detection flow):

```powershell
pip install -r demoviefy-backend/requirements-transcription.txt
```

## Proxy install (school network)

Set the proxy once per session:

```powershell
$env:PROXY_URL="http://proxy.spo.ifsp.edu.br:3128"
```

Then use the launcher:

```powershell
python run_form.py
```

## Easiest way: launcher form

```powershell
python run_form.py
```

Use the buttons:
- `Setup Environment`
- `Start All`
- `Run AI Test` (optional video path)

## Docs

- `docs/RUN_INSTRUCTIONS.md`
- `docs/FRAME_AI.md`

## Run backend

```powershell
cd demoviefy-backend
..\.venv\Scripts\Activate.ps1
python run.py
```

Backend now analyzes uploaded videos with YOLO in MVC flow:

- routes: `demoviefy-backend/app/routes`
- controller: `demoviefy-backend/app/controllers`
- services: `demoviefy-backend/app/services`
- models: `demoviefy-backend/app/models`

By default, video analysis uses your custom model at `ai_model/model/yolo26l.pt` when present.

## Run frontend

```powershell
cd demoviefy-front
npm install
npm run dev
```

## Run YOLO MVC test app

```powershell
.\.venv\Scripts\Activate.ps1
python ai_model/app/app.py
```

`ai_model/app` now reuses backend AI services directly. By default it analyzes the latest video in `uploads/`.
To target a specific file:

```powershell
$env:TEST_VIDEO_PATH="uploads\your_video.mp4"
python ai_model/app/app.py
```

## YOLO test app MVC layout

- `ai_model/app/controllers`: orchestration layer
- `ai_model/app/models`: YOLO inference layer
- `ai_model/app/views`: output/log rendering
- `ai_model/app/config`: app settings
- `ai_model/app/core`: infrastructure utilities
