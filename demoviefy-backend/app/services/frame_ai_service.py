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
import shutil
import time
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any
from datetime import datetime, timezone

import numpy as np

from app.config.paths import analysis_file_path as build_analysis_file_path
from app.config.paths import analysis_variant_file_path as build_analysis_variant_file_path
from app.config.paths import annotated_video_path as build_annotated_video_path
from app.config.paths import annotated_video_variant_path as build_annotated_video_variant_path
from app.config.paths import ensure_storage_dirs
from app.config.paths import ffmpeg_path as resolve_ffmpeg_path
from app.config.paths import ffprobe_path as resolve_ffprobe_path


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



def _normalize_annotated_mp4(
    source_path: Path,
    output_path: Path,
    logger: Any | None = None,
) -> bool:
    """
    Normalize an annotated MP4 into a browser-playable H.264 artifact.

    Args:
        source_path: Temporary video written by OpenCV
        output_path: Final annotated video path
        logger: Optional logger for debug messages

    Returns:
        True when the normalized file is ready at output_path
    """
    import subprocess

    if not source_path.exists():
        return False

    ffmpeg_binary = resolve_ffmpeg_path()
    if ffmpeg_binary is None:
        if logger:
            logger.warning("frame_ai:ffmpeg_missing source=%s output=%s", source_path, output_path)
        return False

    normalized_temp = output_path.parent / f"{output_path.stem}.normalized-{time.time_ns()}{output_path.suffix}"

    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if logger:
            logger.info("frame_ai:mp4_normalize_start source=%s output=%s", source_path, output_path)

        cmd = [
            str(ffmpeg_binary),
            "-i", str(source_path),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-crf", "23",
            "-preset", "ultrafast",
            "-movflags", "+faststart",
            "-an",
            "-y",
            str(normalized_temp),
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=300,
            text=True
        )

        if result.returncode == 0 and normalized_temp.exists():
            if output_path.exists():
                _unlink_with_retries(output_path, logger=logger)
            _copy_with_retries(normalized_temp, output_path, logger=logger)
            if logger:
                logger.info("frame_ai:mp4_normalize_success path=%s", output_path)
            return True

        if logger:
            logger.warning(
                "frame_ai:mp4_normalize_failed returncode=%s stderr=%s",
                result.returncode,
                result.stderr[:400],
            )
        return False

    except subprocess.TimeoutExpired:
        if logger:
            logger.warning("frame_ai:mp4_normalize_timeout source=%s output=%s", source_path, output_path)
        return False
    except Exception as exc:
        if logger:
            logger.warning("frame_ai:mp4_normalize_error error=%s", str(exc))
        return False
    finally:
        if normalized_temp.exists():
            try:
                normalized_temp.unlink()
            except PermissionError:
                if logger:
                    logger.debug("frame_ai:normalized_temp_cleanup_deferred path=%s", normalized_temp)
            except Exception as exc:
                if logger:
                    logger.warning("frame_ai:normalized_temp_cleanup_failed path=%s error=%s", normalized_temp, str(exc))


def _unlink_with_retries(path: Path, *, logger: Any | None = None, attempts: int = 20, delay_seconds: float = 0.5) -> None:
    last_error: Exception | None = None
    for attempt in range(attempts):
        if not path.exists():
            return
        try:
            path.unlink()
            return
        except PermissionError as exc:
            last_error = exc
            time.sleep(delay_seconds)
        except FileNotFoundError:
            return
    if last_error is not None:
        raise last_error
    if logger:
        logger.warning("frame_ai:unlink_retry_exhausted path=%s", path)


def _copy_with_retries(source_path: Path, destination_path: Path, *, logger: Any | None = None, attempts: int = 20, delay_seconds: float = 0.5) -> None:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            shutil.copy2(source_path, destination_path)
            return
        except PermissionError as exc:
            last_error = exc
            time.sleep(delay_seconds)
    if last_error is not None:
        raise last_error
    if logger:
        logger.warning(
            "frame_ai:copy_retry_exhausted source=%s destination=%s",
            source_path,
            destination_path,
        )


def _probe_video_stream(file_path: Path, logger: Any | None = None) -> dict[str, str] | None:
    import subprocess

    ffprobe_binary = resolve_ffprobe_path()
    if ffprobe_binary is None or not file_path.exists():
        return None

    cmd = [
        str(ffprobe_binary),
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,codec_tag_string,pix_fmt",
        "-of", "json",
        str(file_path),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=30,
            text=True,
        )
        if result.returncode != 0:
            if logger:
                logger.warning("frame_ai:ffprobe_failed path=%s stderr=%s", file_path, result.stderr[:300])
            return None

        payload = json.loads(result.stdout or "{}")
        streams = payload.get("streams") or []
        if not streams:
            return None
        stream = streams[0]
        return {
            "codec_name": str(stream.get("codec_name") or ""),
            "codec_tag_string": str(stream.get("codec_tag_string") or ""),
            "pix_fmt": str(stream.get("pix_fmt") or ""),
        }
    except Exception as exc:
        if logger:
            logger.warning("frame_ai:ffprobe_error path=%s error=%s", file_path, str(exc))
        return None


def _is_browser_playable_mp4(file_path: Path, logger: Any | None = None) -> bool:
    stream_info = _probe_video_stream(file_path, logger)
    if stream_info is None:
        return False

    codec_name = stream_info.get("codec_name", "").lower()
    codec_tag = stream_info.get("codec_tag_string", "").lower()
    pixel_format = stream_info.get("pix_fmt", "").lower()
    return codec_name == "h264" and codec_tag == "avc1" and pixel_format == "yuv420p"


def _variant_browser_path(source_path: Path) -> Path:
    return source_path.parent / f"{source_path.stem}.browser{source_path.suffix}"


def _resolve_annotated_source_path(video_id: int, variant_id: str | None = None) -> Path:
    if variant_id:
        return build_annotated_video_variant_path(video_id, variant_id)
    return build_annotated_video_path(video_id)


def build_analysis_variant_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")


def _sanitize_variant_id(variant_id: str) -> str:
    return "".join(character for character in str(variant_id) if character.isalnum() or character in {"-", "_"})


def _variant_file_candidates(video_id: int) -> list[Path]:
    return sorted(
        build_analysis_file_path(video_id).parent.glob(f"video_{video_id}__*.json"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )


def _variant_file_path(video_id: int, variant_id: str) -> Path:
    return build_analysis_variant_file_path(video_id, _sanitize_variant_id(variant_id))


def _variant_annotated_path(video_id: int, variant_id: str) -> Path:
    return build_annotated_video_variant_path(video_id, _sanitize_variant_id(variant_id))


def list_analysis_variants(video_id: int) -> list[dict[str, Any]]:
    variants: list[dict[str, Any]] = []
    for path in _variant_file_candidates(video_id):
        try:
            with open(path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except Exception:
            continue

        variant_id = _sanitize_variant_id(str(payload.get("analysis_variant_id") or path.stem.split("__", 1)[-1]))
        selected_model = payload.get("selected_model") or {}
        variants.append(
            {
                "variant_id": variant_id,
                "created_at": payload.get("analysis_created_at"),
                "task_type": payload.get("task_type"),
                "task_label": selected_model.get("task_label") or payload.get("task_type") or "Análise",
                "model_name": selected_model.get("model_name") or Path(str(payload.get("model_path") or "")).name,
                "frame_stride": payload.get("frame_stride"),
                "clip_start_sec": payload.get("clip_start_sec"),
                "clip_end_sec": payload.get("clip_end_sec"),
            }
        )
    return variants


def resolve_annotated_video_for_web(video_id: int, logger: Any | None = None, variant_id: str | None = None) -> Path | None:
    source_path = _resolve_annotated_source_path(video_id, variant_id)
    if not source_path.exists():
        return None

    if _is_browser_playable_mp4(source_path, logger):
        return source_path

    browser_ready_path = _variant_browser_path(source_path)
    if (
        browser_ready_path.exists()
        and browser_ready_path.stat().st_mtime >= source_path.stat().st_mtime
        and _is_browser_playable_mp4(browser_ready_path, logger)
    ):
        return browser_ready_path

    if _normalize_annotated_mp4(source_path, browser_ready_path, logger) and _is_browser_playable_mp4(browser_ready_path, logger):
        return browser_ready_path

    return source_path


def _annotate_frame_by_task(frame: np.ndarray, result: Any, task_type: str) -> np.ndarray:
    """
    Annotate a frame based on the task type.
    
    Args:
        frame: Input frame (BGR)
        result: YOLO prediction result
        task_type: Type of task ('object_detection', 'instance_segmentation', 'pose_estimation', etc)
        
    Returns:
        Annotated frame in OpenCV-compatible channel order
    """
    
    # Default to frame plot (works for detection, OBB, classification)
    if task_type == "instance_segmentation" and hasattr(result, "masks") and result.masks is not None:
        # Draw segmentation masks
        annotated = result.plot(conf=True)
    elif task_type == "pose_estimation" and hasattr(result, "keypoints") and result.keypoints is not None:
        # Draw pose keypoints and skeleton
        annotated = result.plot(conf=True)
    else:
        # Default: detection, classification, OBB, etc.
        annotated = result.plot(conf=True)
    
    # Ultralytics draws directly onto the OpenCV-originated frame data here,
    # so an extra RGB<->BGR conversion would swap channels and tint people blue.
    return np.ascontiguousarray(annotated)


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
    finalized_annotated_path: Path | None = None
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

        # Initialize VideoWriter on first frame with video dimensions
        if annotated_path and writer is None:
            height, width = frame.shape[:2]
            # Use H.264 with libx264 for maximum compatibility
            # Try multiple approaches for VideoWriter initialization
            writer_initialized = False
            
            # Approach 1: Use mp4v codec with explicit format
            try:
                fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                writer = cv2.VideoWriter(
                    str(temp_annotated_path),
                    fourcc,
                    fps,
                    (width, height),
                )
                if writer and writer.isOpened():
                    writer_initialized = True
                    if logger:
                        logger.info("frame_ai:video_writer_initialized codec=mp4v path=%s", temp_annotated_path)
                else:
                    if writer:
                        writer.release()
                    writer = None
            except Exception as e:
                if logger:
                    logger.debug("frame_ai:mp4v_failed error=%s", str(e))
            
            # Approach 2: Try MJPEG as fallback
            if not writer_initialized:
                try:
                    fourcc = cv2.VideoWriter_fourcc(*"MJPG")
                    writer = cv2.VideoWriter(
                        str(temp_annotated_path),
                        fourcc,
                        fps,
                        (width, height),
                    )
                    if writer and writer.isOpened():
                        writer_initialized = True
                        if logger:
                            logger.info("frame_ai:video_writer_initialized codec=MJPG path=%s", temp_annotated_path)
                    else:
                        if writer:
                            writer.release()
                        writer = None
                except Exception as e:
                    if logger:
                        logger.debug("frame_ai:MJPG_failed error=%s", str(e))
            
            if not writer_initialized:
                annotated_path = None
                if logger:
                    logger.warning("frame_ai:annotated_video_disabled path=%s reason=no_suitable_codec", annotated_output_path)

        # Determine if this frame should be sampled/processed for inference
        should_sample = (frame_index % frame_stride == 0) and (processed_frames < max_frames)
        
        # Process frame inference if it's a sampled frame
        annotated_frame = frame.copy()
        if should_sample:
            sampled_frames += 1
            result = model(frame, verbose=False, conf=conf_threshold)[0]
            names = result.names or {}

            # Aggregate detection results
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

            # Annotate the sampled frame
            if writer is not None:
                annotated_frame = _annotate_frame_by_task(frame, result, task_type)
            
            processed_frames += 1

        # Ensure frame format is correct for VideoWriter
        if annotated_frame.dtype != np.uint8:
            annotated_frame = annotated_frame.astype(np.uint8)
        
        # Write frame to annotated video (all frames, but only sampled ones are annotated)
        if writer is not None:
            try:
                writer.write(annotated_frame)
                annotated_frames_written += 1
            except Exception as e:
                if logger:
                    logger.error("frame_ai:frame_write_error frame_index=%s error=%s", frame_index, str(e))

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
        # Give file a moment to finalize
        import time as time_module
        time_module.sleep(0.2)
        
        if annotated_path is not None and temp_annotated_path is not None and annotated_frames_written > 0:
            if temp_annotated_path.exists() and _normalize_annotated_mp4(temp_annotated_path, annotated_path, logger):
                finalized_annotated_path = annotated_path
                if logger:
                    logger.info(
                        "frame_ai:annotated_video_finalized path=%s frames=%s",
                        finalized_annotated_path,
                        annotated_frames_written,
                    )
            else:
                annotated_frames_written = 0
                if annotated_path.exists():
                    annotated_path.unlink()
                if logger:
                    logger.warning(
                        "frame_ai:annotated_video_unavailable output=%s reason=normalization_failed",
                        annotated_output_path,
                    )

        if temp_annotated_path is not None and temp_annotated_path.exists():
            try:
                temp_annotated_path.unlink()
            except Exception as e:
                if logger:
                    logger.warning("frame_ai:temp_file_cleanup_failed error=%s", str(e))

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
        "annotated_video_path": str(finalized_annotated_path) if finalized_annotated_path else None,
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


def _write_analysis_payload(path: Path, payload: dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=True, indent=2)


def _promote_variant_to_canonical(video_id: int, variant_id: str) -> bool:
    variant_path = _variant_file_path(video_id, variant_id)
    if not variant_path.exists():
        return False

    payload = load_analysis(video_id, variant_id)
    if payload is None:
        return False

    canonical_analysis_path = build_analysis_file_path(video_id)
    _write_analysis_payload(canonical_analysis_path, payload)

    variant_annotated_path = _variant_annotated_path(video_id, variant_id)
    canonical_annotated_path = build_annotated_video_path(video_id)
    if variant_annotated_path.exists():
        shutil.copy2(variant_annotated_path, canonical_annotated_path)
    elif canonical_annotated_path.exists():
        _unlink_with_retries(canonical_annotated_path)

    variant_browser_path = _variant_browser_path(variant_annotated_path)
    canonical_browser_path = _variant_browser_path(canonical_annotated_path)
    if variant_browser_path.exists():
        shutil.copy2(variant_browser_path, canonical_browser_path)
    elif canonical_browser_path.exists():
        _unlink_with_retries(canonical_browser_path)

    return True


def _copy_variant_artifacts(video_id: int, variant_id: str, summary: dict[str, Any]) -> None:
    canonical_annotated = build_annotated_video_path(video_id)
    variant_annotated = build_annotated_video_variant_path(video_id, variant_id)
    if canonical_annotated.exists():
        shutil.copy2(canonical_annotated, variant_annotated)
        browser_ready = _variant_browser_path(canonical_annotated)
        variant_browser_ready = _variant_browser_path(variant_annotated)
        if browser_ready.exists():
            shutil.copy2(browser_ready, variant_browser_ready)
        summary["annotated_video_path"] = str(variant_annotated)


def save_analysis(video_id: int, summary: dict[str, Any]) -> str:
    ensure_storage_dirs()
    variant_id = _sanitize_variant_id(str(summary.get("analysis_variant_id") or build_analysis_variant_id()))
    summary["analysis_variant_id"] = variant_id
    summary["analysis_created_at"] = summary.get("analysis_created_at") or datetime.now(timezone.utc).isoformat()

    canonical_path = build_analysis_file_path(video_id)
    variant_path = build_analysis_variant_file_path(video_id, variant_id)

    with open(canonical_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=True, indent=2)
    with open(variant_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=True, indent=2)

    _copy_variant_artifacts(video_id, variant_id, summary)
    if summary.get("annotated_video_path"):
        with open(canonical_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=True, indent=2)
        with open(variant_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=True, indent=2)
    return str(canonical_path)


def load_analysis(video_id: int, variant_id: str | None = None) -> dict[str, Any] | None:
    path = (
        build_analysis_variant_file_path(video_id, _sanitize_variant_id(variant_id))
        if variant_id
        else build_analysis_file_path(video_id)
    )
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def has_analysis(video_id: int) -> bool:
    return build_analysis_file_path(video_id).exists()


def has_annotated_video(video_id: int) -> bool:
    return build_annotated_video_path(video_id).exists()


def delete_analysis_variant(video_id: int, variant_id: str) -> bool:
    sanitized_variant_id = _sanitize_variant_id(variant_id)
    variant_analysis_path = _variant_file_path(video_id, sanitized_variant_id)
    if not variant_analysis_path.exists():
        return False

    canonical_payload = load_analysis(video_id)
    canonical_variant_id = (
        _sanitize_variant_id(str(canonical_payload.get("analysis_variant_id")))
        if canonical_payload and canonical_payload.get("analysis_variant_id")
        else None
    )

    paths_to_delete = {
        variant_analysis_path,
        _variant_annotated_path(video_id, sanitized_variant_id),
        _variant_browser_path(_variant_annotated_path(video_id, sanitized_variant_id)),
    }

    for path in paths_to_delete:
        if path.exists():
            try:
                _unlink_with_retries(path)
            except Exception:
                pass

    if canonical_variant_id == sanitized_variant_id:
        remaining_variants = list_analysis_variants(video_id)
        next_variant = next(
            (variant for variant in remaining_variants if variant["variant_id"] != sanitized_variant_id),
            None,
        )
        if next_variant is not None:
            _promote_variant_to_canonical(video_id, next_variant["variant_id"])
        else:
            for path in (
                build_analysis_file_path(video_id),
                build_annotated_video_path(video_id),
                _variant_browser_path(build_annotated_video_path(video_id)),
            ):
                if path.exists():
                    try:
                        _unlink_with_retries(path)
                    except Exception:
                        pass

    return True


def delete_analysis_artifacts(video_id: int) -> None:
    paths_to_delete = {
        build_analysis_file_path(video_id),
        build_annotated_video_path(video_id),
        _variant_browser_path(build_annotated_video_path(video_id)),
    }

    for variant_analysis_path in _variant_file_candidates(video_id):
        paths_to_delete.add(variant_analysis_path)
        variant_id = variant_analysis_path.stem.split("__", 1)[-1]
        variant_annotated_path = build_annotated_video_variant_path(video_id, variant_id)
        paths_to_delete.add(variant_annotated_path)
        paths_to_delete.add(_variant_browser_path(variant_annotated_path))

    annotated_dir = build_annotated_video_path(video_id).parent
    for temp_path in annotated_dir.glob(f"video_{video_id}*.processing.mp4"):
        paths_to_delete.add(temp_path)
    for leftover_path in annotated_dir.glob(f"video_{video_id}*.normalized-*.mp4"):
        paths_to_delete.add(leftover_path)

    for path in paths_to_delete:
        if path.exists():
            try:
                _unlink_with_retries(path)
            except Exception:
                pass
