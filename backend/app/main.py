import os
import uuid
import requests as http_requests
import boto3
from urllib.parse import urlparse

from datetime import datetime, timedelta

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, Security, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.auth.transport import requests
from google.oauth2 import id_token
from jose import jwt
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.services.storage import save_recording

from app.db.session import get_db
from app.models.meeting import Meeting
from app.models.meeting_access import MeetingAccess
from app.models.user import User
from fastapi import HTTPException
from app.services.transcription import transcribe_audio
from app.services.summarization import summarize_text
import shutil
import tempfile

from fastapi.staticfiles import StaticFiles
from app.services.audio_utils import iter_audio_chunks

from concurrent.futures import ThreadPoolExecutor
import time


from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
app.mount("/recordings", StaticFiles(directory="recordings"), name="recordings")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-frontend-domain.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# JWT AUTH (KEEP AS-IS)
# =========================

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set")
JWT_ALG = "HS256"
JWT_EXPIRE_MIN = 60 * 24 * 7  # 7 days

def create_access_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MIN)
    payload = {"sub": user_id, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

bearer_scheme = HTTPBearer()

def get_current_user(
    creds: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# =========================
# HEALTH + ME
# =========================

@app.get("/db-health")
def db_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"ok": True}

@app.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"user_id": str(current_user.id), "email": current_user.email, "name": current_user.name}

# =========================
# HELPERS (MEETINGS)
# =========================

def require_meeting_uuid(meeting_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(meeting_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="meeting_id must be a UUID")

def get_meeting_or_404(db: Session, meeting_id: uuid.UUID) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

def require_meeting_owner(db: Session, meeting_id: uuid.UUID, current_user: User) -> Meeting:
    meeting = get_meeting_or_404(db, meeting_id)
    if str(meeting.owner_user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only owner allowed")
    return meeting

def require_can_view(db: Session, meeting_id: uuid.UUID, current_user: User) -> Meeting:
    meeting = get_meeting_or_404(db, meeting_id)

    if str(meeting.owner_user_id) == str(current_user.id):
        return meeting

    shared_access = (
        db.query(MeetingAccess)
        .filter(
            MeetingAccess.meeting_id == meeting.id,
            MeetingAccess.shared_email == current_user.email,
        )
        .first()
    )

    if shared_access:
        return meeting

    raise HTTPException(status_code=403, detail="Not authorized to view this meeting")

    access = (
        db.query(MeetingAccess)
        .filter(MeetingAccess.meeting_id == meeting_id)
        .filter(MeetingAccess.shared_email == current_user.email)
        .first()
    )
    if not access:
        raise HTTPException(status_code=403, detail="Not allowed to view this meeting")
    return meeting

# =========================
# MEETINGS: LIST (OWNED + SHARED)
# =========================

@app.get("/meetings")
def list_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owned = (
        db.query(Meeting)
        .filter(Meeting.owner_user_id == current_user.id)
        .order_by(Meeting.created_at.desc())
        .all()
    )

    shared = (
        db.query(Meeting)
        .join(MeetingAccess, Meeting.id == MeetingAccess.meeting_id)
        .filter(MeetingAccess.shared_email == current_user.email)
        .order_by(Meeting.created_at.desc())
        .all()
    )

    def to_dict(m: Meeting):
        # NOTE: this assumes you added Meeting.summary (TEXT, nullable).
        return {
            "id": str(m.id),
            "owner_user_id": str(m.owner_user_id),
            "title": m.title,
            "transcript": getattr(m, "transcript", None),
            "summary": getattr(m, "summary", None),
            "audio_url": getattr(m, "audio_url", None),
            "created_at": m.created_at,
            "updated_at": m.updated_at,
        }

    return {
        "owned": [to_dict(m) for m in owned],
        "shared": [to_dict(m) for m in shared],
    }

# =========================
# MEETINGS: VIEW DETAIL (OWNER OR SHARED) - VIEW ONLY
# =========================

@app.get("/meetings/{meeting_id}")
def get_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting_uuid = require_meeting_uuid(meeting_id)
    m = require_can_view(db, meeting_uuid, current_user)
    return {
        "id": str(m.id),
        "owner_user_id": str(m.owner_user_id),
        "title": m.title,
        "transcript": getattr(m, "transcript", None),
        "summary": getattr(m, "summary", None),
        "audio_url": getattr(m, "audio_url", None),
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }

@app.post("/meetings/{meeting_id}/upload-audio")
async def upload_audio(
    meeting_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting_uuid = require_meeting_uuid(meeting_id)
    meeting = require_meeting_owner(db, meeting_uuid, current_user)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    saved_path = await save_recording(file, str(meeting.id))

    meeting.audio_url = saved_path

    print("saved_path =", saved_path)
    print("meeting.audio_url =", meeting.audio_url)

    db.commit()
    db.refresh(meeting)

    return {
        "message": "Audio uploaded successfully",
        "meeting_id": str(meeting.id),
        "audio_url": meeting.audio_url,
    }


def download_s3_audio_to_tempfile(s3_url: str) -> str:
    parsed = urlparse(s3_url)
    bucket_name = parsed.netloc.split(".")[0]
    object_key = parsed.path.lstrip("/")

    print("bucket_name =", bucket_name)
    print("object_key =", object_key)

    s3 = boto3.client("s3")

    suffix = os.path.splitext(object_key)[1] or ".webm"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_path = temp_file.name

    s3.download_file(bucket_name, object_key, temp_path)
    return temp_path
    
def generate_presigned_audio_url(s3_url: str, expires_in: int = 3600) -> str:
    parsed = urlparse(s3_url)
    bucket_name = parsed.netloc.split(".")[0]
    object_key = parsed.path.lstrip("/")

    s3 = boto3.client("s3")

    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket_name, "Key": object_key},
        ExpiresIn=expires_in,
    )

@app.get("/meetings/{meeting_id}/audio-url")
def get_audio_url(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting_uuid = require_meeting_uuid(meeting_id)
    meeting = require_can_view(db, meeting_uuid, current_user)

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.audio_url:
        raise HTTPException(status_code=404, detail="No audio found for this meeting")

    presigned_url = generate_presigned_audio_url(meeting.audio_url)

    return {
        "meeting_id": str(meeting.id),
        "audio_url": presigned_url,
    }

def summarize_chunks(chunks):
    if len(chunks) == 1:
        return chunks[0]

    mid = len(chunks) // 2
    left = summarize_chunks(chunks[:mid])
    right = summarize_chunks(chunks[mid:])

    return summarize_text(left + "\n\n" + right)

@app.post("/meetings/{meeting_id}/process-audio")
def process_audio(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting_uuid = require_meeting_uuid(meeting_id)
    meeting = require_can_view(db, meeting_uuid, current_user)

    if meeting.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to process this meeting")

    if not meeting.audio_url:
        raise HTTPException(status_code=400, detail="No audio uploaded for this meeting")

    temp_audio_path = None
    full_transcript_parts = []
    chunk_summaries = []

    try:
        print("process_audio meeting.audio_url =", meeting.audio_url)

        start_time = time.time()

        temp_audio_path = download_s3_audio_to_tempfile(meeting.audio_url)
        print("temp_audio_path =", temp_audio_path)

        chunk_count = 0

        for chunk_path in iter_audio_chunks(temp_audio_path, chunk_length_minutes=10):
            chunk_count += 1
            chunk_start = time.time()
            print(f"Processing chunk {chunk_count}: {chunk_path}")

            try:
                transcript_text = transcribe_audio(chunk_path)
                full_transcript_parts.append(transcript_text)

                chunk_summary = summarize_text(transcript_text)
                chunk_summaries.append(chunk_summary)

            finally:
                if os.path.exists(chunk_path):
                    os.remove(chunk_path)

            chunk_end = time.time()
            print(f"Chunk {chunk_count} finished in {chunk_end - chunk_start:.2f}s")

        if chunk_count == 0:
            raise HTTPException(status_code=400, detail="Failed to generate audio chunks")

        full_transcript = "\n\n".join(full_transcript_parts)
        final_summary = summarize_chunks(chunk_summaries)

        meeting.transcript = full_transcript
        meeting.summary = final_summary

        db.commit()
        db.refresh(meeting)

        end_time = time.time()
        print(f"Total processing time: {end_time - start_time:.2f}s")

        return {
            "meeting_id": str(meeting.id),
            "transcript": meeting.transcript,
            "summary": meeting.summary,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print("process_audio error =", repr(e))
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
# =========================
# MEETINGS: OWNER EDIT (TITLE/SUMMARY)
# =========================

class MeetingUpdateIn(BaseModel):
    title: str | None = None
    summary: str | None = None

@app.patch("/meetings/{meeting_id}")
def update_meeting(
    meeting_id: str,
    body: MeetingUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting_uuid = require_meeting_uuid(meeting_id)
    m = require_meeting_owner(db, meeting_uuid, current_user)

    if body.title is not None:
        m.title = body.title.strip()

    # NOTE: requires Meeting.summary column exists.
    if body.summary is not None:
        m.summary = body.summary

    db.commit()
    db.refresh(m)

    return {
        "id": str(m.id),
        "owner_user_id": str(m.owner_user_id),
        "title": m.title,
        "summary": getattr(m, "summary", None),
        "audio_url": getattr(m, "audio_url", None),
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }

# =========================
# SHARE (OWNER ONLY) - VIEW ONLY FOR RECIPIENTS
# =========================

class ShareIn(BaseModel):
    email: str

@app.post("/meetings/{meeting_id}/share")
def share_meeting(
    meeting_id: str,
    body: ShareIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting_uuid = require_meeting_uuid(meeting_id)
    _ = require_meeting_owner(db, meeting_uuid, current_user)

    email = body.email.lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Missing email")

    access = MeetingAccess(meeting_id=meeting_uuid, shared_email=email)
    db.add(access)
    try:
        db.commit()
        return {"message": "shared"}
    except IntegrityError:
        db.rollback()
        return {"message": "already shared"}

# Optional: keep for backward compat. This is now redundant because GET /meetings includes shared.
@app.get("/shared-with-me")
def shared_with_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meetings = (
        db.query(Meeting)
        .join(MeetingAccess, Meeting.id == MeetingAccess.meeting_id)
        .filter(MeetingAccess.shared_email == current_user.email)
        .order_by(Meeting.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(m.id),
            "title": m.title,
            "owner_user_id": str(m.owner_user_id),
            "summary": getattr(m, "summary", None),
            "audio_url": getattr(m, "audio_url", None),
        }
        for m in meetings
    ]

# =========================
# GOOGLE OAUTH (KEEP AS-IS)
# =========================

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    raise RuntimeError("GOOGLE_CLIENT_ID is not set")

class GoogleVerifyIn(BaseModel):
    id_token: str

@app.post("/auth/google/verify")
def verify_google(body: GoogleVerifyIn):
    try:
        info = id_token.verify_oauth2_token(
            body.id_token,
            requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"{type(e).__name__}: {str(e)}")

    email = info.get("email")
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Token verified but missing email claim. Make sure you're sending a Google ID token (response.credential) and using the correct web client_id.",
        )

    return {
        "email": email,
        "name": info.get("name", ""),
        "sub": info.get("sub"),
        "email_verified": info.get("email_verified"),
        "aud": info.get("aud"),
        "iss": info.get("iss"),
    }

@app.post("/auth/google")
def auth_google(body: GoogleVerifyIn, db: Session = Depends(get_db)):
    try:
        info = id_token.verify_oauth2_token(
            body.id_token,
            requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    email = info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Missing email")

    email = email.lower().strip()
    name = info.get("name", "").strip()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(str(user.id))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email,
        "name": user.name,
    }


class MeetingCreateIn(BaseModel):
    title: str

@app.post("/meetings")
def create_meeting(
    body: MeetingCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title required")

    m = Meeting(owner_user_id=current_user.id, title=title)
    db.add(m)
    db.commit()
    db.refresh(m)

    return {
        "id": str(m.id),
        "owner_user_id": str(m.owner_user_id),
        "title": m.title,
        "summary": getattr(m, "summary", None),
        "audio_url": getattr(m, "audio_url", None),
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }