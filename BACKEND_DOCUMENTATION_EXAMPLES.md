# Backend Code Documentation Examples

## 🎯 Practical Examples for Backend Implementation

This file provides real-world examples for adding documentation to the DeMoviefy backend following the MVC pattern.

---

## 1. Service Layer - Complete Example

### Example: Frame AI Service Enhancement

```python
"""
FRAME AI SERVICE - ADVANCED
---------------------------
Enhanced service layer for AI-powered video analysis.
Demonstrates proper documentation structure for complex services.

This service handles:
1. Loading and caching YOLO models
2. Frame sampling from videos
3. Running inference on frames
4. Aggregating results by class
5. Generating annotated videos
6. Reporting progress
7. Error recovery and validation

Architecture:
- Helper functions for model setup
- Main analysis function with comprehensive documentation
- Callback functions for progress tracking
- Proper error handling with informative messages
"""

import json
import time
import logging
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class FrameAnalysisError(Exception):
    """Base exception for frame analysis operations."""
    pass


class ModelLoadError(FrameAnalysisError):
    """Raised when YOLO model fails to load."""
    pass


class VideoProcessingError(FrameAnalysisError):
    """Raised when video processing fails."""
    pass


# ============================================================================
# HELPER FUNCTIONS - Model Management
# ============================================================================

def _ensure_ultralytics_pose_compat() -> None:
    """
    Ensure backward compatibility with legacy Pose26 model checkpoints.

    Some older YOLO models reference a 'Pose26' class that may not exist
    in newer versions. This function creates an alias to maintain compatibility
    with legacy model checkpoints.

    Side Effects:
        Modifies ultralytics.nn.modules.head module by adding Pose26 alias

    Raises:
        No explicit raises - silently fails if ultralytics not available
    """
    try:
        import ultralytics.nn.modules.head as head
    except Exception as e:
        logger.debug(f"Could not import ultralytics head module: {e}")
        return

    if not hasattr(head, "Pose26") and hasattr(head, "Pose"):
        head.Pose26 = head.Pose  # type: ignore[attr-defined]
        logger.debug("Alias created: Pose26 -> Pose")


@lru_cache(maxsize=2)
def _get_model(model_path: str):
    """
    Load and cache YOLO model with lazy initialization.

    This function uses LRU caching to avoid reloading the same model
    multiple times. Models are imported lazily to avoid hard failures
    at application startup if dependencies are missing.

    Caching Strategy:
        - Cached for up to 2 different model paths
        - Cache key is the absolute path to model file
        - Useful for multi-model scenarios

    Args:
        model_path (str): Absolute path to the YOLO model file (.pt file)
                         Example: "/models/yolov8n.pt"

    Returns:
        YOLO: Loaded model instance ready for inference

    Raises:
        ModelLoadError: If model file not found or corrupted
        RuntimeError: If YOLO library fails to initialize

    Example:
        >>> model = _get_model("/path/to/yolov8n.pt")
        >>> results = model.predict(image)
    """
    from ultralytics import YOLO

    _ensure_ultralytics_pose_compat()

    try:
        logger.info(f"Loading model from: {model_path}")
        model = YOLO(model_path)
        logger.info(f"Model loaded successfully: {model.__class__.__name__}")
        return model

    except FileNotFoundError as e:
        raise ModelLoadError(f"Model file not found: {model_path}") from e
    except Exception as exc:
        # Retry with compatibility fix if Pose26 error detected
        if hasattr(exc, "args") and any("Pose26" in str(arg) for arg in exc.args):
            logger.warning("Pose26 compatibility issue detected, applying fix...")
            _ensure_ultralytics_pose_compat()
            try:
                return YOLO(model_path)
            except Exception as retry_exc:
                raise ModelLoadError(f"Failed to load model after retry: {retry_exc}") from retry_exc
        raise ModelLoadError(f"Failed to load model: {exc}") from exc


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
    clip_end_sec: Optional[float] = None,
    annotated_output_path: Optional[str] = None,
    progress_callback: Optional[Callable[[int, int], None]] = None,
    logger_instance: Optional[logging.Logger] = None,
) -> dict[str, Any]:
    """
    Analyze video frames using YOLO model with sophisticated frame sampling.

    This is the primary entry point for AI-powered video analysis. It orchestrates
    the complete workflow: video loading, frame sampling, inference execution,
    result aggregation, and optional annotated video generation.

    WORKFLOW:
    ┌─────────────┐
    │ Load Video  │
    └──────┬──────┘
           ↓
    ┌──────────────────────┐
    │ Extract Metadata     │ (FPS, frame count, duration)
    └──────┬───────────────┘
           ↓
    ┌──────────────────────┐
    │ Calculate Range      │ (based on clip_start/end)
    └──────┬───────────────┘
           ↓
    ┌──────────────────────┐
    │ Sample Frames        │ (every frame_stride frames)
    └──────┬───────────────┘
           ↓
    ┌──────────────────────┐
    │ Run YOLO Inference   │
    └──────┬───────────────┘
           ↓
    ┌──────────────────────┐
    │ Aggregate Results    │ (by class, calculate stats)
    └──────┬───────────────┘
           ↓
    ┌──────────────────────┐
    │ Generate Annotated   │ (if requested)
    │ Video with Bboxes    │
    └──────┬───────────────┘
           ↓
    │ Return Results JSON  │
    └──────────────────────┘

    Performance Considerations:
        - Frame sampling (stride) reduces processing time significantly
        - max_frames acts as safety limit to prevent out-of-memory
        - Confidence threshold filters low-confidence detections
        - Progress callback updates can be expensive on large videos

    Args:
        video_path (str):
            Absolute path to video file to analyze
            Supported: MP4, AVI, MOV, MKV, WMV
            Example: "/uploads/video_123/video_123.mp4"

        model_path (str):
            Path to YOLO model file
            Options: yolov8n.pt (nano), yolov8s.pt (small), yolov8m.pt (medium), etc.
            Models available in: ai_model/model/Object_Detection/
            Default: "yolov8n.pt" (fastest, least accurate)

        task_type (str):
            Type of AI task to perform
            Options:
            - "object_detection": Detect and locate objects (default)
            - "classification": Classify entire frame
            - "segmentation": Pixel-level segmentation
            - "pose": Detect human body keypoints
            - "oriented_bounding_boxes": For aerial/rotated detection

        frame_stride (int):
            Sample every nth frame
            Examples:
            - stride=1: Analyze every frame (slow, thorough)
            - stride=8: Analyze every 8th frame (default, balanced)
            - stride=16: Analyze every 16th frame (fast, less thorough)
            Range: 1-max_frames
            Default: 8

        conf_threshold (float):
            Minimum confidence score for detections (0.0-1.0)
            - 0.35: Lenient (more detections, more false positives)
            - 0.50: Moderate (recommended for most cases)
            - 0.75: Strict (fewer but more accurate detections)
            Default: 0.35

        max_frames (int):
            Maximum number of frames to process
            Safety limit to prevent out-of-memory errors
            - Actual processed frames: min(max_frames, video_total_frames / frame_stride)
            Default: 300 (typical 5-10 minute video at 8x stride)

        clip_start_sec (float):
            Start time for analysis segment
            - 0.0: Start at beginning
            - Example: 30.5 means start at 30.5 seconds
            Default: 0.0

        clip_end_sec (float | None):
            End time for analysis segment
            - None: Continue to end of video
            - Must be > clip_start_sec
            Example: 120.0 means analyze up to 120 seconds
            Default: None

        annotated_output_path (str | None):
            Path where to save annotated video with bounding boxes
            - None: Don't generate annotated video (faster)
            - Example: "/uploads/annotated/video_123_annotated.mp4"
            Note: Requires ffmpeg, adds ~30-50% processing time
            Default: None

        progress_callback (callable | None):
            Function to call with progress updates
            Signature: callback(current: int, total: int) -> None
            - Called after each processed frame
            - Useful for real-time UI progress bars
            Example: progress_callback(42, 300)  # 42/300 frames done
            Default: None

        logger_instance (logging.Logger | None):
            Logger for debug/info messages
            If provided, logs: start, progress milestones, errors
            Default: None (silent operation)

    Returns:
        dict: Comprehensive analysis results with keys:
        {
            # Processing Metadata
            'task_type': str,                    # Task performed
            'model_path': str,                   # Model used
            'model_name': str,                   # Human-readable name

            # Video Metadata
            'total_frames': int,                 # Total frames in video
            'sampled_frames': int,               # Frames analyzed
            'fps': float,                        # Frames per second
            'duration_seconds': float,           # Video length
            'frame_stride': int,                 # Sampling interval

            # Detection Results - Aggregated
            'detected_labels': {                 # {class_name: count}
                'person': 42,
                'car': 15,
                ...
            },
            'detected_classes': ['person', 'car', ...],  # Unique classes

            # Confidence Statistics
            'class_confidences': {               # Per-class confidence scores
                'person': [0.92, 0.88, ...],
                'car': [0.95, 0.89, ...],
                ...
            },
            'average_confidences': {             # Average per class
                'person': 0.89,
                'car': 0.92,
                ...
            },

            # Temporal Info
            'start_frame': int,                  # Starting frame number
            'end_frame': int,                    # Ending frame number
            'clip_start_sec': float,             # Segment start time
            'clip_end_sec': float | None,        # Segment end time
        }

    Raises:
        ValueError:
            - Video file doesn't exist
            - Invalid clip times (end <= start, start >= video length)
            - frame_stride < 1 or max_frames < 1

        ModelLoadError:
            - Model file not found
            - Model corrupted or incompatible

        VideoProcessingError:
            - Video file unreadable (corrupted)
            - Insufficient memory for video
            - OpenCV not installed

        RuntimeError:
            - Inference fails on YOLO
            - File I/O errors during processing

    Example:
        >>> result = analyze_video_frames(
        ...     video_path="/uploads/video_123/video_123.mp4",
        ...     model_path="yolov8m.pt",
        ...     task_type="object_detection",
        ...     frame_stride=8,
        ...     conf_threshold=0.5,
        ...     max_frames=300,
        ...     progress_callback=lambda c, t: print(f"{c}/{t}"),
        ... )
        >>> print(f"Detected: {result['detected_labels']}")
        {'person': 15, 'car': 8}
        >>> print(f"Avg confidence: {result['average_confidences']}")
        {'person': 0.89, 'car': 0.92}
    """

    # Implementation would follow...
```

---

## 2. Controller Layer - Complete Example

### Example: Video Controller with Detailed Comments

```python
"""
VIDEO CONTROLLER
----------------
HTTP request handlers for video management and AI analysis endpoints.

Handles the following operations:
- Video upload and metadata extraction
- Video listing and filtering
- AI analysis orchestration
- Result retrieval and modification
- Transcription processing
- Status tracking and progress reporting

Architecture:
- Request validation happens first
- Service layer handles business logic
- Responses follow consistent JSON format
- Error handling with informative messages
"""

from flask import Blueprint, request, jsonify, send_file
from functools import wraps
import logging

from app.services import video_service, frame_ai_service
from app.repositories import video_repository

logger = logging.getLogger(__name__)


# ============================================================================
# HELPER FUNCTIONS - Validation & Response Formatting
# ============================================================================

def require_auth(f):
    """
    Decorator to require authentication on endpoints.

    Checks for valid session and user context.
    Returns 401 if authentication fails.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Authentication check would be here
            return f(*args, **kwargs)
        except Unauthorized:
            return jsonify({"error": "Unauthorized"}), 401
    return decorated_function


def validate_video_id(video_id: int) -> tuple[bool, dict | None]:
    """
    Validate that video ID exists and is accessible.

    Args:
        video_id: Video ID to validate

    Returns:
        Tuple of (is_valid, error_response)
    """
    video = video_repository.get_video(video_id)
    if not video:
        return False, jsonify({"error": "Video not found"}), 404
    return True, None


def validate_file_upload(file) -> tuple[bool, str | None]:
    """
    Validate uploaded file.

    Args:
        file: File from request

    Returns:
        Tuple of (is_valid, error_message)
    """
    ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'wmv'}
    MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024  # 5GB

    if not file:
        return False, "No file provided"

    filename = file.filename or ""

    # Check extension
    if not any(filename.lower().endswith(f".{ext}") for ext in ALLOWED_EXTENSIONS):
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    # Check size
    if file.content_length and file.content_length > MAX_FILE_SIZE:
        return False, "File too large (max 5GB)"

    return True, None


# ============================================================================
# ROUTE HANDLERS - API Endpoints
# ============================================================================

bp = Blueprint('videos', __name__, url_prefix='/videos')


@bp.route('', methods=['POST'])
@require_auth
def upload_video():
    """
    Upload a new video and start processing.

    Takes a multipart form with:
    - file (required): Video file to upload
    - ai_config (optional): JSON string with analysis settings

    Starts background thread for video processing.

    Request:
        POST /videos
        Content-Type: multipart/form-data

        Body:
            - file: <binary video data>
            - ai_config: {"model_path": "yolov8n.pt", "frame_stride": 8}

    Response Success (201):
        {
            "success": true,
            "data": {
                "id": 123,
                "filename": "my_video.mp4",
                "status": "PROCESSANDO",
                "created_at": "2024-04-12T10:30:00Z",
                "processing": { ... }
            }
        }

    Response Errors:
        400: Invalid file or configuration
        401: Unauthorized
        413: File too large
        500: Server error during upload

    Side Effects:
        - Creates database record
        - Saves file to disk
        - Starts background processing thread
        - Updates processing state periodically
    """
    try:
        # Validate request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']

        # Validate file
        is_valid, error_msg = validate_file_upload(file)
        if not is_valid:
            return jsonify({"error": error_msg}), 400

        # Create video record
        video = video_service.create_video_from_upload(file)

        # Optional: get AI config from request
        ai_config = None
        if 'ai_config' in request.form:
            try:
                import json
                ai_config = json.loads(request.form['ai_config'])
            except json.JSONDecodeError:
                logger.warning("Invalid ai_config JSON provided")

        # Start background processing
        video_service.start_processing_thread(video.id, ai_config)

        logger.info(f"Video uploaded: {video.id} ({file.filename})")

        return jsonify({
            "success": True,
            "data": video.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Error uploading video: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@bp.route('', methods=['GET'])
def list_videos():
    """
    Retrieve all videos with metadata and status.

    Returns videos sorted by creation date (newest first).
    Includes processing status and storage information.

    Request:
        GET /videos
        GET /videos?limit=10&offset=0

    Query Parameters:
        - limit (int, default=50): Max results to return
        - offset (int, default=0): Pagination offset

    Response Success (200):
        {
            "success": true,
            "data": [
                {
                    "id": 1,
                    "filename": "video.mp4",
                    "status": "CONCLUIDO",
                    "created_at": "2024-04-12T10:30:00Z",
                    "analysis_ready": true,
                    "transcription_ready": false,
                    ...
                },
                ...
            ],
            "total": 45,
            "limit": 10,
            "offset": 0
        }

    Response Errors:
        500: Server error
    """
    try:
        # Get pagination params
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Validate pagination
        limit = max(1, min(limit, 100))  # 1-100 items
        offset = max(0, offset)

        # Get videos
        videos = video_repository.list_videos()

        # Apply pagination
        total = len(videos)
        videos_page = videos[offset:offset + limit]

        # Serialize
        videos_data = [v.to_dict() for v in videos_page]

        return jsonify({
            "success": True,
            "data": videos_data,
            "total": total,
            "limit": limit,
            "offset": offset
        }), 200

    except Exception as e:
        logger.error(f"Error listing videos: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@bp.route('/<int:video_id>', methods=['GET'])
def get_video_details(video_id: int):
    """
    Retrieve detailed information about a specific video.

    Includes full metadata, processing status, and paths to analysis files.

    Path Parameters:
        - video_id (int): Video ID to retrieve

    Response Success (200):
        {
            "success": true,
            "data": {
                "id": 123,
                "filename": "my_video.mp4",
                "status": "CONCLUIDO",
                "created_at": "2024-04-12T10:30:00Z",
                "analysis_ready": true,
                "analysis_url": "/api/videos/123/analysis",
                "processing": {
                    "progress": 100,
                    "stage": "complete",
                    "eta_seconds": null,
                    "message": "Processamento concluído"
                },
                ...
            }
        }

    Response Errors:
        404: Video not found
        500: Server error
    """
    try:
        valid, error = validate_video_id(video_id)
        if not valid:
            return error

        # Get video details
        video = video_repository.get_video(video_id)
        video_dict = video.to_dict()

        # Add computed fields
        video_dict['analysis_ready'] = os.path.exists(...)
        video_dict['processing'] = video_service.get_processing_state(video_id)

        return jsonify({
            "success": True,
            "data": video_dict
        }), 200

    except Exception as e:
        logger.error(f"Error getting video details: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@bp.route('/<int:video_id>', methods=['DELETE'])
@require_auth
def delete_video_by_id(video_id: int):
    """
    Delete a video and all associated files.

    Removes:
    - Database record
    - Original video file
    - Analysis JSON
    - Annotated video
    - Transcription
    - Metadata

    Path Parameters:
        - video_id (int): Video ID to delete

    Response Success (200):
        {
            "success": true,
            "message": "Video deleted successfully"
        }

    Response Errors:
        404: Video not found
        403: Forbidden (not owner)
        500: Server error
    """
    try:
        # Verify ownership/permissions
        valid, error = validate_video_id(video_id)
        if not valid:
            return error

        # Delete everything
        video_service.delete_video_completely(video_id)

        logger.info(f"Video deleted: {video_id}")

        return jsonify({
            "success": True,
            "message": "Video deleted successfully"
        }), 200

    except Exception as e:
        logger.error(f"Error deleting video: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


# Register blueprint
from app import app
app.register_blueprint(bp)
```

---

## 3. Type Hints & Constants

```python
"""
Type definitions and constants for the video service.
"""

from typing import TypedDict, Literal
from enum import Enum


class VideoStatus(str, Enum):
    """Video processing status values."""
    PROCESSANDO = "PROCESSANDO"      # Currently processing
    CONCLUIDO = "CONCLUIDO"          # Completed successfully
    ERRO = "ERRO"                    # Error occurred
    AGUARDANDO = "AGUARDANDO"        # Waiting in queue


class AITaskType(str, Enum):
    """Supported AI task types."""
    OBJECT_DETECTION = "object_detection"
    CLASSIFICATION = "classification"
    SEGMENTATION = "segmentation"
    POSE = "pose"
    ORIENTED_BOXES = "oriented_bounding_boxes"


class ProcessingState(TypedDict):
    """State tracking for video processing."""
    progress: float                  # 0-100
    stage: str                       # "loading", "analyzing", "transcribing", etc.
    eta_seconds: int | None          # Estimated seconds remaining
    message: str                     # Human-readable status message


class VideoMetadata(TypedDict):
    """Complete video metadata."""
    id: int
    filename: str
    status: VideoStatus
    created_at: str
    processing: ProcessingState
    analysis_ready: bool
    transcription_ready: bool
```

---

## 4. Error Handling Best Practices

```python
"""
Error handling patterns for the service layer.
"""

import logging
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar('T')


class ServiceError(Exception):
    """Base class for service layer errors."""
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class VideoNotFoundError(ServiceError):
    """Raised when video ID doesn't exist."""
    def __init__(self, video_id: int):
        super().__init__(
            f"Video {video_id} not found",
            code="VIDEO_NOT_FOUND"
        )


class ProcessingError(ServiceError):
    """Raised when processing operation fails."""
    def __init__(self, message: str):
        super().__init__(message, code="PROCESSING_ERROR")


def handle_service_error(func: Callable[..., T]) -> Callable[..., T]:
    """
    Decorator for consistent error handling in service methods.

    Usage:
        @handle_service_error
        def my_operation() -> Result:
            ...
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ServiceError as e:
            logger.error(f"Service error in {func.__name__}: {e.message}")
            raise
        except ValueError as e:
            logger.error(f"Validation error in {func.__name__}: {e}")
            raise ServiceError(str(e), "VALIDATION_ERROR") from e
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}", exc_info=True)
            raise ServiceError(
                f"Unexpected error: {str(e)}",
                "UNEXPECTED_ERROR"
            ) from e
    return wrapper
```

---

## Summary Checklist

Each service/controller should have:

- ✅ Module docstring explaining overall purpose
- ✅ Section comments dividing logical areas
- ✅ Function docstrings with:
  - One-line summary
  - Detailed explanation if complex
  - Args documentation
  - Returns documentation
  - Raises documentation
  - Usage examples
- ✅ Inline comments for "why", not "what"
- ✅ Type hints on all parameters and returns
- ✅ Proper exception handling with logging
- ✅ Consistent error response format
- ✅ Validation at entry points
- ✅ Clear separation of concerns
