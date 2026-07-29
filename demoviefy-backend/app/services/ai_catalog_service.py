from pathlib import Path

from app.config.paths import MODEL_DIR, to_repo_relative


TASK_DIRECTORY_MAP = {
    "Object_Detection": ("object_detection", "Detecção de Objetos"),
    "Image_Classification": ("image_classification", "Classificação de Imagem"),
    "Instance_Segmentation": ("instance_segmentation", "Segmentação de Instancias"),
    "Oriented_Bounding_Boxes": ("oriented_bounding_boxes", "Caixas Orientadas"),
    "Pose_Estimation": ("pose_estimation", "Estimação de Pose"),
}


def _task_metadata(task_dir: str) -> tuple[str, str]:
    """Return a stable API key and a readable label for a model directory.

    Known folders keep their existing API keys. Any new folder placed in
    ``ai_model/model`` becomes its own selectable task automatically, instead
    of being merged into a generic ``custom`` option.
    """
    known_task = TASK_DIRECTORY_MAP.get(task_dir)
    if known_task:
        return known_task

    task_type = "_".join(
        part.lower() for part in task_dir.replace("-", "_").replace(" ", "_").split("_") if part
    )
    task_label = task_dir.replace("_", " ").replace("-", " ").title()
    return task_type or "custom", task_label or "Custom"


def _build_model_entry(path: Path) -> dict:
    task_dir = path.parent.name
    task_type, task_label = _task_metadata(task_dir)
    return {
        "id": to_repo_relative(path),
        "name": path.name,
        "task_type": task_type,
        "task_label": task_label,
        "relative_path": to_repo_relative(path),
        "absolute_path": str(path),
    }


def list_available_models() -> list[dict]:
    if not MODEL_DIR.exists():
        return []

    models = [_build_model_entry(path) for path in sorted(MODEL_DIR.rglob("*.pt"))]
    return models


def get_model_by_relative_path(relative_path: str | None) -> dict | None:
    if not relative_path:
        return None

    normalized = relative_path.replace("\\", "/").strip("/")
    for model in list_available_models():
        if model["relative_path"] == normalized:
            return model
    return None
