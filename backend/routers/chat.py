import base64
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Any, Optional
from neo4j import Session
import anthropic

from config import settings
from auth.jwt import decode_token
from database import get_db
from storage import download_file

router = APIRouter(prefix="/chat", tags=["chat"])
bearer = HTTPBearer()

MAX_INLINE_TEXT_CHARS = 60_000
MAX_FILE_BYTES_FOR_AI = 8 * 1024 * 1024  # 8MB


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    context: str = "general"  # "general" | "answer_draft" | "file_review"
    context_data: Any = None  # question text, section label, etc.
    file_id: Optional[str] = None
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
    "general": """You are OfferBloom's interview prep assistant. Users have a persistent library of experiences, target roles, and saved answer variations.

Rules:
1. Ground responses in the user's stored context. Never fabricate experiences, metrics, or credentials.
2. If context is missing, ask one focused clarifying question. Do not produce generic advice.
3. Be concise and direct. Lead with the answer. Default under 150 words. No filler praise, no clichés.""",

    "answer_draft": """You are an interview coach drafting STAR answers grounded in the user's actual experiences.

Structure:
- Situation (1 to 2 sentences): scope and stakes
- Task: what the user owned
- Action: 3 to 5 concrete steps
- Result: outcome with metric or qualitative impact

For technical questions use Problem, Approach, Tradeoffs, Outcome instead.

Rules:
- Never invent metrics. Use "[need metric: ___]" for gaps.
- Target 250 to 320 words (90 to 120 seconds spoken).
- Match the user's voice. No "passionate," "synergy," "fast paced world."
- If no experience is selected, ask the user to pick one from their library.
- After the draft, list 2 to 3 likely interviewer follow ups.""",

    "file_review": """You are Bloom, an interview-prep career coach. Output paste-ready edits. Never echo or rewrite the whole document.

Use this exact Markdown template for resumes and cover letters. Up to 5 edits, ranked by impact:

### Edit 1
**❌ Original**
> exact line copied verbatim from the file

**✅ Replace with**
> the new line, ready to paste — no rewording the user must do

**Why:** one short clause, max 12 words

---

### Edit 2
... (same structure) ...

Rules:
- Maximum 5 edits. Fewer is fine. Quality over count.
- Flag only real problems: weak verb, missing metric, vague scope, ATS issue, keyword gap, redundancy, length.
- The Replace line must be final copy. If a metric is missing, embed `[need: % uplift / $ saved / users / latency drop]` inline so the user knows what to fill.
- No preamble. No summary at the end. No pep talk. Just the edits.
- Use `---` between edits so they render as separated cards.

For job descriptions only, skip the edit template. Instead return:

**Required skills:** comma-separated list
**Nice-to-haves:** comma-separated list
**Likely interview themes:** 3 bullets
**Red flags:** 0–3 bullets, only if real

Keep total reply under ~400 words.""",
}


def _load_file_for_ai(db: Session, user_id: str, file_id: str):
    """Return (content_block, name, content_type) or raise 404/413."""
    record = db.run(
        """
        MATCH (u:User {id: $user_id})-[:OWNS]->(f:File {id: $file_id})
        RETURN f.r2_key AS key, f.name AS name, f.content_type AS content_type, f.size AS size
        """,
        user_id=user_id,
        file_id=file_id,
    ).single()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if record["size"] > MAX_FILE_BYTES_FOR_AI:
        raise HTTPException(status_code=413, detail="File too large for AI review")

    data = download_file(record["key"])
    ctype = record["content_type"]
    name = record["name"]

    if ctype == "application/pdf":
        block = {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": base64.standard_b64encode(data).decode("ascii"),
            },
        }
    elif ctype == "text/plain":
        text = data.decode("utf-8", errors="replace")[:MAX_INLINE_TEXT_CHARS]
        block = {"type": "text", "text": f"--- File: {name} ---\n{text}"}
    elif ctype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        # DOCX: zip of XML. Best-effort plain-text via document.xml strip.
        import io, zipfile, re
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                xml = z.read("word/document.xml").decode("utf-8", errors="replace")
            text = re.sub(r"<[^>]+>", " ", xml)
            text = re.sub(r"\s+", " ", text).strip()[:MAX_INLINE_TEXT_CHARS]
        except Exception:
            text = "(Could not extract DOCX text)"
        block = {"type": "text", "text": f"--- File: {name} ---\n{text}"}
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type for AI review: {ctype}")

    return block, name, ctype


@router.post("/", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    system = SYSTEM_PROMPTS.get(body.context, SYSTEM_PROMPTS["general"])
    if body.context_data:
        system += f"\n\nContext: {body.context_data}"

    messages = [{"role": m.role, "content": m.content} for m in body.history]

    file_block = None
    if body.context == "file_review" and body.file_id:
        file_block, fname, _ = _load_file_for_ai(db, user_id, body.file_id)
        system += f"\n\nThe user has attached the file '{fname}'. Use its contents to answer."

    if file_block:
        messages.append({"role": "user", "content": [file_block, {"type": "text", "text": body.message}]})
    else:
        messages.append({"role": "user", "content": body.message})

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system,
        messages=messages,
    )

    return ChatResponse(reply=response.content[0].text)
