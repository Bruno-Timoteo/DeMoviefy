"""
Train an object detection model for video-frame analysis.

Example:
python scripts/train_detector.py --data datasets/mydata/data.yaml --model yolov8n.pt --epochs 80
"""

import argparse


def build_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a YOLO detector with Ultralytics.")
    parser.add_argument("--data", required=True, help="Path to data.yaml")
    parser.add_argument("--model", default="yolov8n.pt", help="Base model weights")
    parser.add_argument("--epochs", type=int, default=80, help="Training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--project", default="runs/detect", help="Output project folder")
    parser.add_argument("--name", default="demoviefy-detector", help="Run name")
    parser.add_argument("--device", default=None, help="cuda, cpu, or device index")
    return parser.parse_args()


def main() -> None:
    args = build_args()
    from ultralytics import YOLO

    model = YOLO(args.model)
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
    print(f"Best model path: {results.save_dir}/weights/best.pt")


if __name__ == "__main__":
    main()
