# DeMoviefy

## Monorepo structure

- `demoviefy-backend`: Flask API
- `demoviefy-front`: React frontend
- `teste`: YOLO test app (refactored to MVC)

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

## Easiest way: launcher form

```powershell
python run_form.py
```

Use the buttons:
- `Setup Environment`
- `Start All`
- `Run AI Test` (optional video path)

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

By default, video analysis uses your custom model at `teste/model/yolo26l.pt` when present.

## Run frontend

```powershell
cd demoviefy-front
npm install
npm run dev
```

## Run YOLO MVC test app

```powershell
.\.venv\Scripts\Activate.ps1
python teste/app/app.py
```

`teste/app` now reuses backend AI services directly. By default it analyzes the latest video in `uploads/`.
To target a specific file:

```powershell
$env:TEST_VIDEO_PATH="uploads\your_video.mp4"
python teste/app/app.py
```

## YOLO test app MVC layout

- `teste/app/controllers`: orchestration layer
- `teste/app/models`: YOLO inference layer
- `teste/app/views`: output/log rendering
- `teste/app/config`: app settings
- `teste/app/core`: infrastructure utilities
