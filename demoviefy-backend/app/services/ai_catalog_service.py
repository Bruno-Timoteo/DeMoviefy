from pathlib import Path

from app.config.paths import MODEL_DIR, to_repo_relative


TASK_DIRECTORY_MAP = {
    "Object_Detection": ("object_detection", "Deteccao de Objetos"),
    "Image_Classification": ("image_classification", "Classificacao de Imagem"),
    "Instance_Segmentation": ("instance_segmentation", "Segmentacao de Instancias"),
    "Oriented_Bounding_Boxes": ("oriented_bounding_boxes", "Caixas Orientadas"),
    "Pose_Estimation": ("pose_estimation", "Estimacao de Pose"),
}


def _build_model_entry(path: Path) -> dict:
    task_dir = path.parent.name
    task_type, task_label = TASK_DIRECTORY_MAP.get(task_dir, ("custom", task_dir))
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
