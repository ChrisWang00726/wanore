from app.services.transcription import transcribe_audio

file_path = r"C:\Users\Chris\OneDrive\Desktop\conshot\backend\recordings\14c76685-5838-400c-8b1f-8e89b745d6b0.webm"

result = transcribe_audio(file_path)
print(result)