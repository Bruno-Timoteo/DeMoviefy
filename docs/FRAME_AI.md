# Frame AI (Detection + Training)

This backend runs frame-level object detection when a video is uploaded.

## 1) Install dependencies

```powershell
cd demoviefy-backend
pip install -r requirements.txt
```

## 2) Configure inference (optional)

Environment variables:

- `FRAME_AI_MODEL` (default priority: env var -> `ai_model/model/yolo26l.pt` -> `yolov8n.pt`)
- `FRAME_AI_FRAME_STRIDE` (default: `8`)
- `FRAME_AI_CONFIDENCE` (default: `0.35`)
- `FRAME_AI_MAX_FRAMES` (default: `300`)

Example:

```powershell
$env:FRAME_AI_MODEL="runs/detect/demoviefy-detector/weights/best.pt"
$env:FRAME_AI_FRAME_STRIDE="6"
$env:FRAME_AI_CONFIDENCE="0.40"
$env:FRAME_AI_MAX_FRAMES="400"
python run.py
```

## 3) APIs

- `POST /videos` uploads video and starts background analysis.
- `GET /videos` returns videos and `analysis_ready` flag.
- `GET /videos/<id>` returns a single video.
- `PATCH /videos/<id>` updates a video status.
- `DELETE /videos/<id>` deletes a video.
- `GET /videos/<id>/analysis` returns aggregated labels/confidence for that video.

Analysis JSON files are saved in: `uploads/analysis/video_<id>.json`.

## MVC flow in backend

- Routes: `app/routes/video_routes.py`
- Controller: `app/controllers/video_controller.py`
- Service: `app/services/video_service.py` + `app/services/frame_ai_service.py`
- Model: `app/models/video.py`

## 4) Train a stronger model

Use your labeled dataset in YOLO format:

```powershell
cd demoviefy-backend
python scripts/train_detector.py --data datasets/mydata/data.yaml --model yolov8n.pt --epochs 80
```

After training, use the generated `best.pt` as `FRAME_AI_MODEL`.

## 5) Precision tips

- Label difficult classes with more samples.
- Include hard negatives (frames without target objects).
- Increase image size (`--imgsz 768` or `960`) if GPU allows.
- Start with `yolov8s.pt` or `yolov8m.pt` for better accuracy than `yolov8n.pt`.
- Tune threshold (`FRAME_AI_CONFIDENCE`) per class use case.
