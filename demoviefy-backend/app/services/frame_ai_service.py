import json
from collections import Counter, defaultdict
from functools import lru_cache
from typing import Any

from app.config.paths import analysis_file_path as build_analysis_file_path
from app.config.paths import ensure_storage_dirs


@lru_cache(maxsize=2)
def _get_model(model_path: str):
    from ultralytics import YOLO  # Imported lazily to avoid hard failure at app import time.

    return YOLO(model_path)


def analyze_video_frames(
    *,
    video_path: str,
    model_path: str = "yolov8n.pt",
    task_type: str = "object_detection",
    frame_stride: int = 8,
    conf_threshold: float = 0.35,
    max_frames: int = 300,
    logger: Any | None = None,
) -> dict[str, Any]:
    """
    Run frame sampling and summarize the chosen AI task across the video.

    We keep the output format intentionally compact so it can be edited by the
    frontend and also stored as plain JSON beside the uploaded video.
    """
    try:
        import cv2
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("opencv-python is required for frame analysis.") from exc

    try:
        model = _get_model(model_path)
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Failed to load model '{model_path}'.") from exc

    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise RuntimeError(f"Could not open video file: {video_path}")

    labels_counter: Counter[str] = Counter()
    confidence_sum: defaultdict[str, float] = defaultdict(float)
    confidence_count: defaultdict[str, int] = defaultdict(int)
    sampled_frames = 0
    processed_frames = 0
    frame_index = 0

    if logger:
        logger.info(
            "frame_ai:start video_path=%s model=%s task=%s stride=%s conf=%.2f max_frames=%s",
            video_path,
            model_path,
            task_type,
            frame_stride,
            conf_threshold,
            max_frames,
        )

    while processed_frames < max_frames:
        ok, frame = capture.read()
        if not ok:
            break

        if frame_index % frame_stride != 0:
            frame_index += 1
            continue

        sampled_frames += 1
        result = model(frame, verbose=False, conf=conf_threshold)[0]
        names = result.names or {}

        if task_type == "image_classification" and getattr(result, "probs", None) is not None:
            top_index = int(result.probs.top1)
            label = names.get(top_index, str(top_index))
            confidence = float(result.probs.top1conf)
            labels_counter[label] += 1
            confidence_sum[label] += confidence
            confidence_count[label] += 1
        elif result.boxes is not None and len(result.boxes) > 0:
            classes = result.boxes.cls.tolist()
            confidences = result.boxes.conf.tolist()

            for cls_idx, conf in zip(classes, confidences):
                label = names.get(int(cls_idx), str(int(cls_idx)))
                labels_counter[label] += 1
                confidence_sum[label] += float(conf)
                confidence_count[label] += 1

        processed_frames += 1
        frame_index += 1

    capture.release()

    avg_confidence = {
        label: round(confidence_sum[label] / confidence_count[label], 4)
        for label in labels_counter.keys()
    }
    label_counts = dict(labels_counter.most_common())
    top_labels = list(label_counts.keys())[:10]

    summary = {
        "video_path": video_path,
        "model_path": model_path,
        "task_type": task_type,
        "frame_stride": frame_stride,
        "confidence_threshold": conf_threshold,
        "max_frames": max_frames,
        "sampled_frames": sampled_frames,
        "processed_frames": processed_frames,
        "total_detections": int(sum(label_counts.values())),
        "label_counts": label_counts,
        "avg_confidence_by_label": avg_confidence,
        "top_labels": top_labels,
    }

    if logger:
        logger.info(
            "frame_ai:done sampled_frames=%s detections=%s unique_labels=%s",
            sampled_frames,
            summary["total_detections"],
            len(label_counts),
        )

    return summary


def analysis_file_path(video_id: int) -> str:
    return str(build_analysis_file_path(video_id))


def save_analysis(video_id: int, summary: dict[str, Any]) -> str:
    ensure_storage_dirs()
    path = analysis_file_path(video_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=True, indent=2)
    return path


def load_analysis(video_id: int) -> dict[str, Any] | None:
    path = analysis_file_path(video_id)
    if not build_analysis_file_path(video_id).exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def has_analysis(video_id: int) -> bool:
    return build_analysis_file_path(video_id).exists()
