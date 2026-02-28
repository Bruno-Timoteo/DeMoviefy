from pathlib import Path

from config.settings import DetectionSettings
from models.detection_model import DetectionModel
from views.console_view import ConsoleView


ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


class DetectionController:
    def __init__(self, *, settings: DetectionSettings, view: ConsoleView):
        self.settings = settings
        self.view = view
        self.model = DetectionModel(settings.backend_root)

    def run(self) -> None:
        self.view.info("Starting unified video detection workflow (teste -> backend service).")
        try:
            video_path = self._resolve_video_path()
            summary, elapsed = self.model.detect_video(video_path=video_path)
            self._render_results(video_path=video_path, summary=summary, elapsed=elapsed)
            self.view.info("Workflow completed.")
        except Exception as exc:
            self.view.exception(f"Detection workflow failed: {exc}")

    def _resolve_video_path(self) -> Path:
        if self.settings.explicit_video_path:
            path = self.settings.explicit_video_path
            if not path.is_absolute():
                path = self.settings.repo_root / path
            if not path.exists():
                raise FileNotFoundError(f"TEST_VIDEO_PATH not found: {path}")
            self.view.info(f"Using TEST_VIDEO_PATH video: {path}")
            return path

        if not self.settings.uploads_dir.exists():
            raise FileNotFoundError(f"Uploads folder not found: {self.settings.uploads_dir}")

        candidates = [
            p
            for p in self.settings.uploads_dir.iterdir()
            if p.is_file() and p.suffix.lower() in ALLOWED_VIDEO_EXTENSIONS
        ]
        if not candidates:
            raise FileNotFoundError(
                "No uploaded videos found in uploads/. Upload a video first or set TEST_VIDEO_PATH."
            )

        latest_video = max(candidates, key=lambda p: p.stat().st_mtime)
        self.view.info(f"Using latest uploaded video: {latest_video}")
        return latest_video

    def _render_results(self, *, video_path: Path, summary: dict, elapsed: float) -> None:
        self.view.info(f"Video analyzed: {video_path}")
        self.view.info(f"Processing time: {elapsed:.2f}s")
        self.view.info(f"Model used: {summary.get('model_path')}")
        self.view.info(f"Sampled frames: {summary.get('sampled_frames')}")
        self.view.info(f"Total detections: {summary.get('total_detections')}")

        top_labels = summary.get("top_labels", [])
        if not top_labels:
            self.view.info("No objects detected.")
            return

        self.view.info(f"Top labels: {top_labels}")
        counts = summary.get("label_counts", {})
        confidences = summary.get("avg_confidence_by_label", {})

        for label in top_labels[:5]:
            self.view.info(
                f"Label={label} count={counts.get(label, 0)} avg_conf={confidences.get(label, 0):.2f}"
            )
