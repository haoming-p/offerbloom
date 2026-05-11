"""Audio transcription via OpenAI Whisper.

Mobile records a practice attempt as audio, uploads here, and we return the
text. Web frontend uses Web Speech API directly, so this endpoint exists
primarily for mobile.
"""

import io
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from auth.jwt import decode_token
from config import settings

router = APIRouter(prefix="/transcribe", tags=["transcribe"])
bearer = HTTPBearer()

MAX_AUDIO_BYTES = 25 * 1024 * 1024  # Whisper hard limit is 25 MB per request


class TranscribeResponse(BaseModel):
    text: str


def _check_auth(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/", response_model=TranscribeResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    """Transcribe an uploaded audio file via OpenAI Whisper."""
    _check_auth(credentials)

    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="Transcription service not configured")

    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio upload")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large (25MB max)")

    # OpenAI SDK is imported lazily so missing pip install doesn't break the
    # whole app boot — only this endpoint surfaces the error.
    try:
        from openai import OpenAI
    except ImportError:
        raise HTTPException(status_code=503, detail="openai package not installed")

    client = OpenAI(api_key=settings.openai_api_key)

    # Whisper wants a file-like with a sensible name extension.
    buf = io.BytesIO(data)
    buf.name = audio.filename or "audio.m4a"

    try:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=buf,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Whisper API error: {e}")

    return TranscribeResponse(text=result.text or "")
