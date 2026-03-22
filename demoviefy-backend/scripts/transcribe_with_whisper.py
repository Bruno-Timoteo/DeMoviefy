"""
Run Whisper in an isolated Python environment and print JSON to stdout.
"""

import argparse
import json


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transcribe a video with Whisper.")
    parser.add_argument("--video", required=True, help="Absolute path to the video file.")
    parser.add_argument("--model", default="base", help="Whisper model name.")
    parser.add_argument("--language", default=None, help="Optional language code.")
    return parser.parse_args()


def main() -> None:
    import whisper

    args = parse_args()
    model = whisper.load_model(args.model)
    result = model.transcribe(args.video, verbose=False, language=args.language)

    segments = [
        {
            "id": int(segment.get("id", index)),
            "start": round(float(segment.get("start", 0.0)), 2),
            "end": round(float(segment.get("end", 0.0)), 2),
            "text": str(segment.get("text", "")).strip(),
        }
        for index, segment in enumerate(result.get("segments", []))
        if str(segment.get("text", "")).strip()
    ]
    payload = {
        "content": " ".join(segment["text"] for segment in segments).strip(),
        "source": "whisper",
        "language": result.get("language") or args.language,
        "segments": segments,
        "model_name": args.model,
        "status": "ready",
        "error": None,
    }
    print(json.dumps(payload, ensure_ascii=True))


if __name__ == "__main__":
    main()
