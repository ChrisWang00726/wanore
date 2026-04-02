import os
from math import ceil
from pydub import AudioSegment


def split_audio(file_path: str, chunk_length_minutes: int = 10) -> list[str]:
    audio = AudioSegment.from_file(file_path)
    chunk_length_ms = chunk_length_minutes * 60 * 1000

    total_chunks = ceil(len(audio) / chunk_length_ms)
    chunk_paths = []

    base_name, _ = os.path.splitext(file_path)
    output_dir = f"{base_name}_chunks"
    os.makedirs(output_dir, exist_ok=True)

    for i in range(total_chunks):
        start_ms = i * chunk_length_ms
        end_ms = min((i + 1) * chunk_length_ms, len(audio))

        chunk = audio[start_ms:end_ms]
        chunk_path = os.path.join(output_dir, f"chunk_{i}.mp3")

        chunk.export(chunk_path, format="mp3")
        chunk_paths.append(chunk_path)

    return chunk_paths