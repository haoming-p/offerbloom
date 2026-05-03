import uuid
import time
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from neo4j import Session

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
