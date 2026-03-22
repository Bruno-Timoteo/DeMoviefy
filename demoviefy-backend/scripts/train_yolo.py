"""
Generic training entrypoint for the YOLO models shipped in this repository.

Examples:
python scripts/train_yolo.py --data datasets/myset/data.yaml --task object_detection --size n
python scripts/train_yolo.py --data datasets/myset/data.yaml --task instance_segmentation --model ai_model/model/Instance_Segmentation/yolo26s-seg.pt
"""

import argparse
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_ROOT = REPO_ROOT / "ai_model" / "model"

TASK_DEFAULTS = {
    "object_detection": MODEL_ROOT / "Object_Detection" / "yolo26n.pt",
    "image_classification": MODEL_ROOT / "Image_Classification" / "yolo26n-cls.pt",
    "instance_segmentation": MODEL_ROOT / "Instance_Segmentation" / "yolo26n-seg.pt",
    "oriented_bounding_boxes": MODEL_ROOT / "Oriented_Bounding_Boxes" / "yolo26n-obb.pt",
    "pose_estimation": MODEL_ROOT / "Pose_Estimation" / "yolo26n-pose.pt",
}

SIZE_SUFFIX_MAP = {
    "n": "n",
    "s": "s",
    "m": "m",
    "l": "l",
    "x": "x",
}


def build_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train YOLO models used by DeMoviefy.")
    parser.add_argument("--data", required=True, help="Path to data.yaml")
    parser.add_argument("--task", choices=sorted(TASK_DEFAULTS), default="object_detection")
    parser.add_argument("--size", choices=sorted(SIZE_SUFFIX_MAP), default="n")
    parser.add_argument("--model", help="Optional explicit weights path")
    parser.add_argument("--epochs", type=int, default=80, help="Training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--project", default="runs/demoviefy", help="Output project folder")
    parser.add_argument("--name", default="experiment", help="Run name")
    parser.add_argument("--device", default=None, help="cuda, cpu, or device index")
    return parser.parse_args()


def resolve_model_path(task: str, size: str, explicit_model: str | None) -> str:
    if explicit_model:
        return explicit_model

    default_path = TASK_DEFAULTS[task]
    filename = default_path.name.replace("26n", f"26{SIZE_SUFFIX_MAP[size]}")
    candidate = default_path.with_name(filename)
    return str(candidate if candidate.exists() else default_path)


def main() -> None:
    args = build_args()
    from ultralytics import YOLO

    model_path = resolve_model_path(args.task, args.size, args.model)

    # Ultralytics uses the model weights to infer the exact head/task, so the
    # training call stays the same across detection, segmentation and the other
    # supported variants.
    model = YOLO(model_path)
    train_args = {
        "data": args.data,
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "project": args.project,
        "name": args.name,
    }
    if args.device:
        train_args["device"] = args.device

    results = model.train(**train_args)
    print("Training finished.")
    print(f"Task: {args.task}")
    print(f"Base model: {model_path}")
    print(f"Best model path: {results.save_dir}/weights/best.pt")


if __name__ == "__main__":
    main()
