"""AI helpers that don't fit a specific resource (e.g. JD formatting).
Keep prompts here so they're easy to tune in one place."""
import anthropic
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from config import settings
from auth.jwt import decode_token

router = APIRouter(prefix="/ai", tags=["ai"])
bearer = HTTPBearer()


def _require_user(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        return decode_token(credentials.credentials)["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class FormatJDRequest(BaseModel):
    text: str


class FormatJDResponse(BaseModel):
    formatted: str


JD_FORMAT_PROMPT = """You are a job-description formatter. Reformat the JD below as clean Markdown.

Rules:
- Preserve every piece of information. Do not summarize, drop, or invent content.
- Use bold section headings (e.g. **About the role**, **Responsibilities**, **Requirements**, **Nice to have**, **Benefits**, **Compensation**, **Location**) only when the source text supports them.
- Convert run-on paragraphs of items into bullet lists when they read as lists.
- Keep company name, team, and location facts intact verbatim.
- No preamble, no commentary. Output only the formatted JD.

Job description:
---
{text}
---"""


@router.post("/format-jd", response_model=FormatJDResponse)
def format_jd(
    body: FormatJDRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    _require_user(credentials)

    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    if len(text) > 20000:
        raise HTTPException(status_code=413, detail="JD too long (max 20k chars)")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": JD_FORMAT_PROMPT.format(text=text)}],
    )

    formatted = message.content[0].text.strip()
    return FormatJDResponse(formatted=formatted)
