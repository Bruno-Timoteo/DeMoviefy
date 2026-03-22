"""
Train an object detection model for video-frame analysis.

Example:
python scripts/train_detector.py --data datasets/mydata/data.yaml --model yolov8n.pt --epochs 80
"""

def main() -> None:
    # Keep the old entrypoint working, but route everything through the new
    # generic training script so the project only has one training workflow.
    from train_yolo import main as train_main

    train_main()


if __name__ == "__main__":
    main()
