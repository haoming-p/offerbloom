from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Any
import anthropic

from config import settings
from auth.jwt import decode_token

router = APIRouter(prefix="/chat", tags=["chat"])
bearer = HTTPBearer()


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    context: str = "general"  # "general" | "answer_draft" | "file_review"
    context_data: Any = None  # question text, file name, etc.
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


SYSTEM_PROMPTS = {
    "general": (
        "You are OfferBloom's interview assistant. Help users prepare for job interviews. "
        "Be concise, practical, and encouraging. Focus on actionable advice."
    ),
    "answer_draft": (
        "You are an expert interview coach helping draft STAR-format answers. "
        "When given a question, provide a concise, structured answer template. "
        "Ask clarifying questions to personalize the answer. Be direct and practical."
    ),
    "file_review": (
        "You are a career coach reviewing job application materials. "
        "Provide specific, actionable feedback on resumes, cover letters, and other documents. "
        "Focus on impact, clarity, and alignment with the target role."
    ),
}


@router.post("/", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    _get_current_user_id(credentials)

    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    system = SYSTEM_PROMPTS.get(body.context, SYSTEM_PROMPTS["general"])
    if body.context_data:
        system += f"\n\nContext: {body.context_data}"

    messages = [{"role": m.role, "content": m.content} for m in body.history]
    messages.append({"role": "user", "content": body.message})

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system,
        messages=messages,
    )

    return ChatResponse(reply=response.content[0].text)
