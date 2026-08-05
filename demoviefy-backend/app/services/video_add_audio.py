from pathlib import Path
import ffmpeg

def add_audio_to_annotated_video(video_original: str, video_processado: str, destino: str) -> Path:
    (
        ffmpeg
        .output(
            ffmpeg.input(video_processado).video,
            ffmpeg.input(video_original).audio,
            destino,
            vcodec="copy",
            acodec="aac"
        )
        .overwrite_output()
        .run(quiet=True)
    )

    return Path(destino)