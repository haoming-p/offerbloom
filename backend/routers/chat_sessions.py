"""Per-question chat session storage.

Schema:
  (:User)-[:HAS_CHAT]->(:ChatSession {id, question_id, started_at, last_used_at, title})
  (:ChatSession)-[:HAS_MESSAGE]->(:Message {id, role, content, created_at, order})

A "session" is one continuous conversation tied to one question. The user can:
  - Continue the most-recent session for a question (default on opening the AI panel)
  - Hit "refresh" to start a brand-new session (this endpoint just creates one)
  - Browse past sessions in the history dropdown (paginated by 10)

The actual append-on-chat happens in routers/chat.py — this file only manages
session metadata and message reads.
"""

import time
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from neo4j import Session

from database import get_db
from auth.jwt import decode_token

router = APIRouter(prefix="/chat-sessions", tags=["chat-sessions"])
bearer = HTTPBearer()


class ChatSessionOut(BaseModel):
    id: str
    question_id: str
    started_at: int
    last_used_at: int
    title: str = ""
    message_count: int = 0


class ChatSessionCreate(BaseModel):
    question_id: str


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: int
    order: int


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _verify_question_ownership(db: Session, user_id: str, question_id: str):
    """Make sure the question belongs to this user before letting them create
    or list sessions against it."""
    result = db.run(
        "MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {id: $q_id}) RETURN q",
        user_id=user_id,
        q_id=question_id,
    )
    if not result.single():
        raise HTTPException(status_code=404, detail="Question not found")


@router.get("/", response_model=list[ChatSessionOut])
def list_sessions(
    question_id: str,
    limit: int = 10,
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """List chat sessions for a question, newest first.

    Paginated for the history dropdown: default page = 10, frontend can scroll
    to load more by passing an offset.
    """
    user_id = _get_current_user_id(credentials)
    _verify_question_ownership(db, user_id, question_id)

    # Clamp limit so a misbehaving client can't ask for huge pages.
    limit = max(1, min(limit, 50))
    offset = max(0, offset)

    rows = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_CHAT]->(s:ChatSession {question_id: $q_id})
        OPTIONAL MATCH (s)-[:HAS_MESSAGE]->(m:Message)
        WITH s, count(m) AS message_count
        RETURN s, message_count
        ORDER BY s.last_used_at DESC
        SKIP $offset LIMIT $limit
        """,
        user_id=user_id,
        q_id=question_id,
        limit=limit,
        offset=offset,
    ).data()

    return [
        ChatSessionOut(
            id=r["s"]["id"],
            question_id=r["s"]["question_id"],
            started_at=r["s"]["started_at"],
            last_used_at=r["s"]["last_used_at"],
            title=r["s"].get("title", ""),
            message_count=r["message_count"],
        )
        for r in rows
    ]


@router.post("/", response_model=ChatSessionOut, status_code=201)
def create_session(
    data: ChatSessionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Create a new chat session for a question. This is what the "refresh"
    button calls — the previous session is left intact in history."""
    user_id = _get_current_user_id(credentials)
    _verify_question_ownership(db, user_id, data.question_id)

    session_id = str(uuid.uuid4())
    now = int(time.time() * 1000)

    db.run(
        """
        MATCH (u:User {id: $user_id})
        CREATE (s:ChatSession {
            id: $id,
            question_id: $q_id,
            started_at: $now,
            last_used_at: $now,
            title: ''
        })
        CREATE (u)-[:HAS_CHAT]->(s)
        """,
        user_id=user_id,
        id=session_id,
        q_id=data.question_id,
        now=now,
    )

    return ChatSessionOut(
        id=session_id,
        question_id=data.question_id,
        started_at=now,
        last_used_at=now,
        title="",
        message_count=0,
    )


@router.get("/{session_id}/messages", response_model=list[MessageOut])
def get_messages(
    session_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Load all messages for a session, in order. Used both for resuming the
    most-recent session and for browsing history."""
    user_id = _get_current_user_id(credentials)

    # Ownership: only sessions reachable through this user.
    owned = db.run(
        "MATCH (u:User {id: $user_id})-[:HAS_CHAT]->(s:ChatSession {id: $s_id}) RETURN s.id AS id",
        user_id=user_id,
        s_id=session_id,
    ).single()
    if not owned:
        raise HTTPException(status_code=404, detail="Session not found")

    rows = db.run(
        """
        MATCH (s:ChatSession {id: $s_id})-[:HAS_MESSAGE]->(m:Message)
        RETURN m ORDER BY m.order ASC
        """,
        s_id=session_id,
    ).data()

    return [
        MessageOut(
            id=r["m"]["id"],
            role=r["m"]["role"],
            content=r["m"]["content"],
            created_at=r["m"]["created_at"],
            order=r["m"]["order"],
        )
        for r in rows
    ]


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Delete a session and all its messages. Not exposed in the UI yet, but
    handy for cleanup."""
    user_id = _get_current_user_id(credentials)

    owned = db.run(
        "MATCH (u:User {id: $user_id})-[:HAS_CHAT]->(s:ChatSession {id: $s_id}) RETURN s.id AS id",
        user_id=user_id,
        s_id=session_id,
    ).single()
    if not owned:
        raise HTTPException(status_code=404, detail="Session not found")

    db.run(
        """
        MATCH (s:ChatSession {id: $s_id})
        OPTIONAL MATCH (s)-[:HAS_MESSAGE]->(m:Message)
        DETACH DELETE m, s
        """,
        s_id=session_id,
    )
