import uuid
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from neo4j import Session

from database import get_db
from models.answer import AnswerOut, AnswerCreate, AnswerUpdate
from auth.jwt import decode_token

router = APIRouter(prefix="/answers", tags=["answers"])
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


@router.post("/", response_model=AnswerOut, status_code=201)
def create_answer(
    data: AnswerCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    _verify_question_ownership(db, user_id, data.question_id)

    answer_id = str(uuid.uuid4())
    db.run(
        """
        MATCH (q:Question {id: $q_id})
        CREATE (a:Answer {id: $id, label: $label, content: $content})
        CREATE (q)-[:HAS_ANSWER]->(a)
        """,
        q_id=data.question_id,
        id=answer_id,
        label=data.label,
        content=data.content,
    )
    return AnswerOut(id=answer_id, label=data.label, content=data.content)


@router.put("/{answer_id}", response_model=AnswerOut)
def update_answer(
    answer_id: str,
    data: AnswerUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question)-[:HAS_ANSWER]->(a:Answer {id: $a_id})
        SET a.label = $label, a.content = $content
        RETURN a
        """,
        user_id=user_id,
        a_id=answer_id,
        label=data.label,
        content=data.content,
    )
    record = result.single()
    if not record:
        raise HTTPException(status_code=404, detail="Answer not found")

    return AnswerOut(id=answer_id, label=data.label, content=data.content)


@router.delete("/{answer_id}", status_code=204)
def delete_answer(
    answer_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question)-[:HAS_ANSWER]->(a:Answer {id: $a_id})
        RETURN a
        """,
        user_id=user_id,
        a_id=answer_id,
    )
    if not result.single():
        raise HTTPException(status_code=404, detail="Answer not found")

    db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question)-[:HAS_ANSWER]->(a:Answer {id: $a_id})
        DETACH DELETE a
        """,
        user_id=user_id,
        a_id=answer_id,
    )
