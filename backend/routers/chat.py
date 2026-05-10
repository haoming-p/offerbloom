import base64
import time
import uuid
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
from services.rag_context import build_rag_context

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
    question_id: Optional[str] = None  # used by RAG to retrieve saved answers/practices/linked files
    session_id: Optional[str] = None  # if set, this chat turn is appended to the session's :Message log
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


def _persist_turn(
    db: Session,
    user_id: str,
    session_id: str,
    user_text: str,
    assistant_text: str,
) -> None:
    """Append a user message + assistant reply to a chat session.

    Ownership-checks the session in the same query (so we can't write into
    someone else's session even if the client lies about session_id). On any
    error we swallow it — chat should never fail because persistence failed.
    """
    try:
        # Pull current message count to assign monotonic order indices.
        record = db.run(
            """
            MATCH (u:User {id: $user_id})-[:HAS_CHAT]->(s:ChatSession {id: $s_id})
            OPTIONAL MATCH (s)-[:HAS_MESSAGE]->(m:Message)
            RETURN s.id AS sid, count(m) AS n
            """,
            user_id=user_id,
            s_id=session_id,
        ).single()
        if not record or not record["sid"]:
            return  # session not owned by user, or doesn't exist

        next_order = record["n"]
        now = int(time.time() * 1000)

        db.run(
            """
            MATCH (s:ChatSession {id: $s_id})
            CREATE (s)-[:HAS_MESSAGE]->(:Message {
                id: $u_id, role: 'user', content: $u_text,
                created_at: $now, order: $u_order
            })
            CREATE (s)-[:HAS_MESSAGE]->(:Message {
                id: $a_id, role: 'assistant', content: $a_text,
                created_at: $now, order: $a_order
            })
            SET s.last_used_at = $now
            """,
            s_id=session_id,
            u_id=str(uuid.uuid4()),
            u_text=user_text,
            u_order=next_order,
            a_id=str(uuid.uuid4()),
            a_text=assistant_text,
            a_order=next_order + 1,
            now=now,
        )

        # Auto-title the session from the first user message (first 60 chars).
        # Helps the history dropdown show something recognizable.
        if next_order == 0:
            title = user_text.strip().replace("\n", " ")[:60]
            db.run(
                "MATCH (s:ChatSession {id: $s_id}) SET s.title = $title",
                s_id=session_id,
                title=title,
            )
    except Exception as e:
        print(f"[chat] persistence failed for session={session_id}: {e}")


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

    # ---------------------------------------------------------------------
    # RAG INJECTION POINT
    # If the frontend tells us which question the user is working on, pull
    # that question's role / position / saved answers / saved practices /
    # linked file text from the graph and append it to the system prompt.
    # See services/rag_context.py for exactly what's retrieved + token caps.
    # Silent failure: if retrieval errors, chat still works without context.
    # ---------------------------------------------------------------------
    if body.question_id:
        try:
            rag_block = build_rag_context(db, user_id, body.question_id)
            if rag_block:
                system += "\n\n" + rag_block
        except Exception as e:
            # Don't break chat if RAG retrieval fails — just log and continue.
            print(f"[chat] RAG retrieval failed for q={body.question_id}: {e}")

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

    reply_text = response.content[0].text

    # ---------------------------------------------------------------------
    # CHAT PERSISTENCE (Phase D1)
    # If the client passed session_id, append this user turn + AI reply as
    # :Message nodes on the session. See routers/chat_sessions.py for the
    # session lifecycle and persistence helper above for the write logic.
    # ---------------------------------------------------------------------
    if body.session_id:
        _persist_turn(db, user_id, body.session_id, body.message, reply_text)

    return ChatResponse(reply=reply_text)
