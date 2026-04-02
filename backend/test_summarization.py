from app.services.summarization import summarize_text

print("starting summarization test...")

transcript = """
Chris said authentication is complete.
They agreed to implement transcription next.
Action item: build process-audio endpoint.
"""

result = summarize_text(transcript)

print("done")
print(result)