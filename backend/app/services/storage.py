import os
from pathlib import Path

import boto3
from fastapi import UploadFile

print("AWS_REGION =", os.getenv("AWS_REGION"))
print("S3_BUCKET_NAME =", os.getenv("S3_BUCKET_NAME"))

s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")


async def save_recording(file: UploadFile, meeting_id: str) -> str:
    file_ext = Path(file.filename or "recording.webm").suffix or ".webm"
    s3_key = f"{meeting_id}{file_ext}"

    contents = await file.read()

    s3.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=s3_key,
        Body=contents,
        ContentType=file.content_type or "audio/webm",
    )

    return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{s3_key}"