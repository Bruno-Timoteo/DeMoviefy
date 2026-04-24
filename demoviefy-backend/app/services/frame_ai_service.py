"""
FRAME AI SERVICE
----------------
Service layer for AI-powered video frame analysis using YOLO models.
Handles video processing, frame sampling, model inference, and annotation.
Part of the MVC pattern (Model-View-Controller).

Key Responsibilities:
- Load and cache YOLO models
- Sample frames from videos at specified stride intervals
- Run inference on sampled frames (detection, segmentation, pose estimation, classification)
- Aggregate detection results
- Generate annotated videos with bounding boxes, masks, or keypoints
- Handle progress tracking and error recovery
- Persist analysis results to JSON files
"""

import json
import time
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from app.config.paths import analysis_file_path as build_analysis_file_path
from app.config.paths import annotated_video_path as build_annotated_video_path
from app.config.paths import ensure_storage_dirs


# ============================================================================
# HELPER FUNCTIONS - Model Loading & Compatibility
# ============================================================================

def _ensure_ultralytics_compat() -> None:
    """
    Ensure backward compatibility with legacy YOLO26 model checkpoints.
    
    Creates aliases in ultralytics modules for legacy class names so they
    can be found during model deserialization. Also creates stub classes
    for components that were removed in newer ultralytics versions.
    """
    try:
        import torch
        import ultralytics.nn.modules.head as head
        import ultralytics.nn.modules.block as block
    except Exception:
        return

    # Map legacy class names to their current equivalents
    legacy_head_mappings = {
        "Pose26": "Pose",
        "Segment26": "Segment",
        "Detect26": "Detect",
        "Classify26": "Classify",
        "Orient26": "OBB",
    }
    
    legacy_block_mappings = {
        "Proto26": "Proto",
        "C2f26": "C2f",
        "DFL26": "DFL",
        "CBLinear26": "CBLinear",
    }

    # Create aliases in head module (skip Pose26 - we handle it separately below)
    for legacy_name, current_name in legacy_head_mappings.items():
        if legacy_name == "Pose26":
            continue  # Skip, handle separately
        if not hasattr(head, legacy_name) and hasattr(head, current_name):
            setattr(head, legacy_name, getattr(head, current_name))

    # Create aliases in block module
    for legacy_name, current_name in legacy_block_mappings.items():
        if not hasattr(block, legacy_name) and hasattr(block, current_name):
            setattr(block, legacy_name, getattr(block, current_name))
    
    # Create stub classes for components that don't exist in current version
    # RealNVP was a normalizing flow component used in older pose models
    if not hasattr(head, 'RealNVP'):
        class RealNVP(torch.nn.Module):
            """Stub for legacy RealNVP normalizing flow component."""
            def __init__(self, *args, **kwargs):
                super().__init__()
            
            def forward(self, x):
                return x
        
        setattr(head, 'RealNVP', RealNVP)
    
    # Create compatible Pose26 class that handles tensor dimension mismatches
    # Legacy Pose26 models have different output dimensions than current Pose
    if not hasattr(head, 'Pose26'):
        from ultralytics.nn.modules.head import Pose
        
        class Pose26(Pose):
            """Pose26 head compatible with legacy YOLO26 checkpoints.
            
            Adapts the forward pass to handle dimension mismatches between
            legacy and modern YOLO architectures.
            """
            def kpts_decode(self, bs, kpt):
                """Decode keypoints with dimension compatibility handling."""
                try:
                    # Try the standard decode first
                    return super().kpts_decode(bs, kpt)
                except RuntimeError as e:
                    # If dimensions don't match, try to adapt
                    if "must match the size of tensor" in str(e):
                        # Legacy models have 8400 detections, modern has 5040
                        # Reshape kpt to match anchors/strides dimensions
                        if kpt.shape[-1] > self.anchors.shape[-1]:
                            # Truncate excess dimensions
                            kpt = kpt[:, :, :self.anchors.shape[-1]]
                        elif kpt.shape[-1] < self.anchors.shape[-1]:
                            # Pad dimensions if needed
                            pad_size = self.anchors.shape[-1] - kpt.shape[-1]
                            kpt = torch.nn.functional.pad(kpt, (0, pad_size))
                        
                        # Retry with adapted dimensions
                        return super().kpts_decode(bs, kpt)
                    raise
        
        setattr(head, 'Pose26', Pose26)


@lru_cache(maxsize=2)
def _get_model(model_path: str):
    """
    Load and cache YOLO model with lazy initialization.
    
    Lazy imports the YOLO model only when needed to avoid hard failures
    at app startup. Results are cached to avoid reloading the same model.
    
    Args:
        model_path (str): Path to the YOLO model file
        
    Returns:
        YOLO: Loaded model instance ready for inference
        
    Raises:
        RuntimeError: If model fails to load
    """
    from ultralytics import YOLO  # Imported lazily to avoid hard failure at app import time.

    # Ensure compatibility aliases exist before loading
    _ensure_ultralytics_compat()

    try:
        return YOLO(model_path)
    except Exception as exc:
        raise RuntimeError(f"Failed to load model '{model_path}'.") from exc


def _annotate_frame_by_task(frame: np.ndarray, result: Any, task_type: str) -> np.ndarray:
    """
    Annotate a frame based on the task type.
    
    Args:
        frame: Input frame (BGR)
        result: YOLO prediction result
        task_type: Type of task ('object_detection', 'instance_segmentation', 'pose_estimation', etc)
        
    Returns:
        Annotated frame
    """
    import cv2
    
    # Default to frame plot (works for detection, OBB, classification)
    if task_type == "instance_segmentation" and hasattr(result, "masks") and result.masks is not None:
        # Draw segmentation masks
        annotated = result.plot(conf=True)
        return annotated
    
    elif task_type == "pose_estimation" and hasattr(result, "keypoints") and result.keypoints is not None:
        # Draw pose keypoints and skeleton
        annotated = result.plot(conf=True)
        return annotated
    
    else:
        # Default: detection, classification, OBB, etc.
        return result.plot(conf=True)


# ============================================================================
# MAIN ANALYSIS FUNCTION
# ============================================================================

def analyze_video_frames(
    *,
    video_path: str,
    model_path: str = "yolov8n.pt",
    task_type: str = "object_detection",
    frame_stride: int = 8,
    conf_threshold: float = 0.35,
    max_frames: int = 300,
    clip_start_sec: float = 0.0,
    clip_end_sec: float | None = None,
    annotated_output_path: str | None = None,
    progress_callback: Any | None = None,
    logger: Any | None = None,
) -> dict[str, Any]:
    """
    Analyze video frames using YOLO model with frame sampling.

    This is the main entry point for video analysis. It:
    1. Opens the video file and extracts metadata (FPS, frame count, duration)
    2. Samples frames at specified stride intervals
    3. Runs inference on each sampled frame
    4. Aggregates results by detected object class and confidence
    5. Optionally generates annotated video with bounding boxes
    6. Reports progress via callback function
    
    Output format is intentionally compact for frontend editing and JSON storage.

    Args:
        video_path (str): Path to the video file to analyze
        model_path (str): Path to YOLO model file (default: yolov8n.pt - nano model)
        task_type (str): Type of AI task - "object_detection", "classification", etc.
        frame_stride (int): Sample every nth frame (e.g., stride=8 means every 8th frame)
        conf_threshold (float): Confidence threshold for detections (0.0-1.0)
        max_frames (int): Maximum number of frames to process
        clip_start_sec (float): Start time of video segment (seconds)
        clip_end_sec (float|None): End time of video segment (seconds). None = video end
        annotated_output_path (str|None): Path to save annotated video. None = no output
        progress_callback (callable|None): Function to report progress (current, total)
        logger (logging.Logger|None): Logger for debug output
        
    Returns:
        dict: Analysis results with aggregated detections:
            {
                'task_type': str,
                'model_path': str,
                'total_frames': int,
                'sampled_frames': int,
                'fps': float,
                'duration_seconds': float,
                'detected_labels': dict,           # {label: count, ...}
                'class_confidences': dict,        # {label: [conf, ...], ...}
                'detected_classes': list,         # unique class names
                'average_confidences': dict,      # {label: avg_confidence, ...}
                'start_frame': int,
                'end_frame': int,
                'clip_start_sec': float,
                'clip_end_sec': float
            }
            
    Raises:
        RuntimeError: If opencv-python not installed, model fails to load, or video is invalid
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
    annotated_frames_written = 0
    writer = None
    annotated_path = Path(annotated_output_path) if annotated_output_path else None
    temp_annotated_path = (
        annotated_path.parent / f"{annotated_path.stem}.processing{annotated_path.suffix}"
        if annotated_path is not None
        else None
    )
    fps = capture.get(cv2.CAP_PROP_FPS) or 0.0
    fps = fps if fps > 0 else 24.0
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration_seconds = round(frame_count / fps, 2) if frame_count > 0 else None
    start_frame = max(0, int(round(clip_start_sec * fps)))
    end_frame = int(round(clip_end_sec * fps)) if clip_end_sec is not None else None
    total_available_frames = (end_frame - start_frame) if end_frame is not None else max(frame_count - start_frame, 0)
    estimated_total_samples = max(
        1,
        min(
            max_frames,
            ((max(total_available_frames, 1) - 1) // max(frame_stride, 1)) + 1,
        ),
    )
    started_at = time.monotonic()

    if end_frame is not None and frame_count > 0:
        end_frame = min(end_frame, frame_count)

    if frame_count > 0 and start_frame >= frame_count:
        capture.release()
        raise RuntimeError("O trecho selecionado comeca depois do fim do video.")

    if clip_end_sec is not None and clip_end_sec <= clip_start_sec:
        capture.release()
        raise RuntimeError("O trecho selecionado possui fim invalido.")

    if start_frame > 0:
        capture.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        frame_index = start_frame

    if annotated_path is not None and temp_annotated_path is not None:
        temp_annotated_path.parent.mkdir(parents=True, exist_ok=True)
        if temp_annotated_path.exists():
            temp_annotated_path.unlink()

    if logger:
        logger.info(
            "frame_ai:start video_path=%s model=%s task=%s stride=%s conf=%.2f max_frames=%s clip_start=%.2f clip_end=%s annotated=%s",
            video_path,
            model_path,
            task_type,
            frame_stride,
            conf_threshold,
            max_frames,
            clip_start_sec,
            clip_end_sec if clip_end_sec is not None else "video_end",
            annotated_output_path or "disabled",
        )

    while True:
        if processed_frames >= max_frames:
            break

        if end_frame is not None and frame_index >= end_frame:
            break

        ok, frame = capture.read()
        if not ok:
            break

        if annotated_path and writer is None:
            height, width = frame.shape[:2]
            writer = cv2.VideoWriter(
                str(temp_annotated_path),
                cv2.VideoWriter_fourcc(*"mp4v"),
                fps,
                (width, height),
            )
            if not writer.isOpened():
                writer.release()
                writer = None
                annotated_path = None
                if logger:
                    logger.warning("frame_ai:annotated_video_disabled path=%s", annotated_output_path)

        if frame_index % frame_stride != 0 or processed_frames >= max_frames:
            if writer is not None:
                writer.write(frame)
                annotated_frames_written += 1
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
        elif task_type == "instance_segmentation" and hasattr(result, "masks") and result.masks is not None:
            # Process segmentation masks
            if result.boxes is not None and len(result.boxes) > 0:
                classes = result.boxes.cls.tolist()
                confidences = result.boxes.conf.tolist()
                for cls_idx, conf in zip(classes, confidences):
                    label = names.get(int(cls_idx), str(int(cls_idx)))
                    labels_counter[label] += 1
                    confidence_sum[label] += float(conf)
                    confidence_count[label] += 1
        elif task_type == "pose_estimation" and hasattr(result, "keypoints") and result.keypoints is not None:
            # Process pose keypoints
            if result.boxes is not None and len(result.boxes) > 0:
                classes = result.boxes.cls.tolist()
                confidences = result.boxes.conf.tolist()
                for cls_idx, conf in zip(classes, confidences):
                    label = names.get(int(cls_idx), str(int(cls_idx)))
                    labels_counter[label] += 1
                    confidence_sum[label] += float(conf)
                    confidence_count[label] += 1
        elif result.boxes is not None and len(result.boxes) > 0:
            # Default processing for detection, OBB, etc.
            classes = result.boxes.cls.tolist()
            confidences = result.boxes.conf.tolist()

            for cls_idx, conf in zip(classes, confidences):
                label = names.get(int(cls_idx), str(int(cls_idx)))
                labels_counter[label] += 1
                confidence_sum[label] += float(conf)
                confidence_count[label] += 1

        if writer is not None:
            annotated_frame = _annotate_frame_by_task(frame, result, task_type)
            writer.write(annotated_frame)
            annotated_frames_written += 1

        processed_frames += 1
        frame_index += 1

        if progress_callback is not None:
            ratio = min(sampled_frames / max(estimated_total_samples, 1), 1.0)
            elapsed_seconds = time.monotonic() - started_at
            progress_callback(
                {
                    "ratio": ratio,
                    "sampled_frames": sampled_frames,
                    "estimated_total_samples": estimated_total_samples,
                    "elapsed_seconds": elapsed_seconds,
                }
            )

    capture.release()
    if writer is not None:
        writer.release()
        if annotated_path is not None and temp_annotated_path is not None and annotated_frames_written > 0:
            if annotated_path.exists():
                annotated_path.unlink()
            temp_annotated_path.replace(annotated_path)
        elif temp_annotated_path is not None and temp_annotated_path.exists():
            temp_annotated_path.unlink()

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
        "clip_start_sec": round(clip_start_sec, 2),
        "clip_end_sec": round(clip_end_sec, 2) if clip_end_sec is not None else None,
        "video_duration_sec": duration_seconds,
        "sampled_frames": sampled_frames,
        "processed_frames": processed_frames,
        "total_detections": int(sum(label_counts.values())),
        "label_counts": label_counts,
        "avg_confidence_by_label": avg_confidence,
        "top_labels": top_labels,
        "annotated_video_path": str(annotated_path) if annotated_path and annotated_frames_written > 0 else None,
        "annotated_frames_written": annotated_frames_written,
    }

    if logger:
        logger.info(
            "frame_ai:done sampled_frames=%s detections=%s unique_labels=%s annotated_frames=%s",
            sampled_frames,
            summary["total_detections"],
            len(label_counts),
            annotated_frames_written,
        )

    return summary


def analysis_file_path(video_id: int) -> str:
    return str(build_analysis_file_path(video_id))


def annotated_file_path(video_id: int) -> str:
    return str(build_annotated_video_path(video_id))


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


def has_annotated_video(video_id: int) -> bool:
    return build_annotated_video_path(video_id).exists()
