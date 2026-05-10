import uuid
import time
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from neo4j import Session
import anthropic

from config import settings
from database import get_db
from models.practice import PracticeOut, PracticeCreate
from auth.jwt import decode_token

router = APIRouter(prefix="/practices", tags=["practices"])
bearer = HTTPBearer()


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _verify_question_ownership(db: Session, user_id: str, question_id: str):
    result = db.run(
        "MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {id: $q_id}) RETURN q",
        user_id=user_id,
        q_id=question_id,
    )
    if not result.single():
        raise HTTPException(status_code=404, detail="Question not found")


@router.post("/", response_model=PracticeOut, status_code=201)
def create_practice(
    data: PracticeCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    _verify_question_ownership(db, user_id, data.question_id)

    practice_id = str(uuid.uuid4())
    created_at = int(time.time() * 1000)  # ms timestamp to match frontend Date.now()

    db.run(
        """
        MATCH (q:Question {id: $q_id})
        CREATE (p:Practice {
            id: $id,
            tag: $tag,
            duration: $duration,
            transcript: $transcript,
            created_at: $created_at
        })
        CREATE (q)-[:HAS_PRACTICE]->(p)
        """,
        q_id=data.question_id,
        id=practice_id,
        tag=data.tag,
        duration=data.duration,
        transcript=data.transcript,
        created_at=created_at,
    )

    return PracticeOut(
        id=practice_id,
        tag=data.tag,
        duration=data.duration,
        transcript=data.transcript,
        ai_feedback=None,
        created_at=created_at,
    )


@router.patch("/{practice_id}/feedback", response_model=PracticeOut)
def generate_feedback(
    practice_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    user_id = _get_current_user_id(credentials)

    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question)-[:HAS_PRACTICE]->(p:Practice {id: $p_id})
        RETURN p
        """,
        user_id=user_id,
        p_id=practice_id,
    )
    record = result.single()
    if not record:
        raise HTTPException(status_code=404, detail="Practice not found")

    practice = record["p"]
    transcript = practice.get("transcript", "")
    if not transcript or transcript.startswith("(Voice transcript"):
        raise HTTPException(status_code=400, detail="No transcript available for feedback")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": (
                    "You are an interview coach. Evaluate this practice answer transcript.\n\n"
                    f"Transcript:\n{transcript}\n\n"
                    "Respond ONLY with valid JSON in this exact format:\n"
                    '{"score": <1-10>, "strengths": ["...", "...", "..."], "improvements": ["...", "...", "..."]}'
                ),
            }
        ],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw
        if raw.endswith("```"):
            raw = raw[:-3].strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start : end + 1]
    try:
        feedback = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"AI returned invalid response: {raw[:200]}")

    feedback_json = json.dumps(feedback)
    db.run(
        "MATCH (p:Practice {id: $p_id}) SET p.ai_feedback = $feedback",
        p_id=practice_id,
        feedback=feedback_json,
    )

    return PracticeOut(
        id=practice["id"],
        tag=practice["tag"],
        duration=practice["duration"],
        transcript=transcript,
        ai_feedback=feedback,
        created_at=practice["created_at"],
    )


@router.delete("/{practice_id}", status_code=204)
def delete_practice(
    practice_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question)-[:HAS_PRACTICE]->(p:Practice {id: $p_id})
        RETURN p
        """,
        user_id=user_id,
        p_id=practice_id,
    )
    if not result.single():
        raise HTTPException(status_code=404, detail="Practice not found")

    db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question)-[:HAS_PRACTICE]->(p:Practice {id: $p_id})
        DETACH DELETE p
        """,
        user_id=user_id,
        p_id=practice_id,
    )
