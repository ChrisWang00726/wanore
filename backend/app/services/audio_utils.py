import math
import os
import shutil
import subprocess
import tempfile


def get_audio_duration_seconds(file_path: str) -> float:
    ffprobe_path = shutil.which("ffprobe")
    if not ffprobe_path:
        raise RuntimeError("ffprobe is not installed or not on PATH")

    result = subprocess.run(
        [
            ffprobe_path,
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    return float(result.stdout.strip())


def iter_audio_chunks(file_path: str, chunk_length_minutes: int = 10):
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        raise RuntimeError("ffmpeg is not installed or not on PATH")

    chunk_length_seconds = chunk_length_minutes * 60
    duration_seconds = get_audio_duration_seconds(file_path)
    total_chunks = math.ceil(duration_seconds / chunk_length_seconds)

    chunk_dir = tempfile.mkdtemp(prefix="audio_chunks_")

    try:
        for i in range(total_chunks):
            start_seconds = i * chunk_length_seconds
            chunk_path = os.path.join(chunk_dir, f"chunk_{i}.mp3")

            subprocess.run(
                [
                    ffmpeg_path,
                    "-y",
                    "-ss", str(start_seconds),
                    "-t", str(chunk_length_seconds),
                    "-i", file_path,
                    "-vn",
                    "-acodec", "mp3",
                    chunk_path,
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            yield chunk_path

    finally:
        shutil.rmtree(chunk_dir, ignore_errors=True)