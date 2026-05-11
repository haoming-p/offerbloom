import time
import uuid
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from neo4j import Session

from auth.jwt import decode_token
from database import get_db
from models.story import StoryOut, StoryCreate, StoryUpdate

router = APIRouter(prefix="/stories", tags=["stories"])
bearer = HTTPBearer()


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _row_to_out(s) -> StoryOut:
    return StoryOut(
        id=s["id"],
        title=s["title"],
        content=s.get("content", "") or "",
        # Stored as "" for null so Cypher comparisons stay simple; surface null
        # to the client to match the model's Optional.
        role_id=s.get("role_id") or None,
        created_at=s["created_at"],
        updated_at=s.get("updated_at", s["created_at"]),
    )


@router.get("/", response_model=list[StoryOut])
def list_stories(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_STORY]->(s:Story)
        RETURN s ORDER BY s.updated_at DESC
        """,
        user_id=user_id,
    )
    return [_row_to_out(r["s"]) for r in result.data()]


@router.post("/", response_model=StoryOut, status_code=201)
def create_story(
    data: StoryCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    title = (data.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Story title cannot be empty")

    story_id = str(uuid.uuid4())
    now = int(time.time() * 1000)
    record = db.run(
        """
        MATCH (u:User {id: $user_id})
        CREATE (s:Story {
            id: $id,
            title: $title,
            content: $content,
            role_id: $role_id,
            created_at: $now,
            updated_at: $now
        })
        CREATE (u)-[:HAS_STORY]->(s)
        RETURN s
        """,
        user_id=user_id,
        id=story_id,
        title=title,
        content=data.content or "",
        role_id=data.role_id or "",
        now=now,
    ).single()
    if not record:
        raise HTTPException(status_code=404, detail="User not found")
    return _row_to_out(record["s"])


@router.put("/{story_id}", response_model=StoryOut)
def update_story(
    story_id: str,
    data: StoryUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    updates: dict[str, object] = {}
    if data.title is not None:
        title = data.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Story title cannot be empty")
        updates["title"] = title
    if data.content is not None:
        updates["content"] = data.content
    if data.role_id is not None:
        # "" widens the story to apply to all roles.
        updates["role_id"] = data.role_id

    if not updates:
        # Idempotent: just return current state.
        record = db.run(
            """
            MATCH (u:User {id: $user_id})-[:HAS_STORY]->(s:Story {id: $story_id})
            RETURN s
            """,
            user_id=user_id,
            story_id=story_id,
        ).single()
        if not record:
            raise HTTPException(status_code=404, detail="Story not found")
        return _row_to_out(record["s"])

    updates["updated_at"] = int(time.time() * 1000)
    set_clause = ", ".join(f"s.{k} = ${k}" for k in updates)
    record = db.run(
        f"""
        MATCH (u:User {{id: $user_id}})-[:HAS_STORY]->(s:Story {{id: $story_id}})
        SET {set_clause}
        RETURN s
        """,
        user_id=user_id,
        story_id=story_id,
        **updates,
    ).single()
    if not record:
        raise HTTPException(status_code=404, detail="Story not found")
    return _row_to_out(record["s"])


@router.delete("/{story_id}", status_code=204)
def delete_story(
    story_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_STORY]->(s:Story {id: $story_id})
        DETACH DELETE s
        RETURN count(*) AS n
        """,
        user_id=user_id,
        story_id=story_id,
    ).single()
    if not result or result["n"] == 0:
        raise HTTPException(status_code=404, detail="Story not found")
