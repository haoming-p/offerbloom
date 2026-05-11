import time
import uuid
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from neo4j import Session

from auth.jwt import decode_token
from database import get_db
from models.preference import PreferenceOut, PreferenceCreate, PreferenceUpdate

router = APIRouter(prefix="/preferences", tags=["preferences"])
bearer = HTTPBearer()


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _row_to_out(p) -> PreferenceOut:
    return PreferenceOut(
        id=p["id"],
        text=p["text"],
        scope=p["scope"],
        role_id=p.get("role_id") or None,
        created_at=p["created_at"],
    )


@router.get("/", response_model=list[PreferenceOut])
def list_preferences(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_PREFERENCE]->(p:Preference)
        RETURN p ORDER BY p.created_at DESC
        """,
        user_id=user_id,
    )
    return [_row_to_out(r["p"]) for r in result.data()]


@router.post("/", response_model=PreferenceOut, status_code=201)
def create_preference(
    data: PreferenceCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    text = (data.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Preference text cannot be empty")

    pref_id = str(uuid.uuid4())
    created_at = int(time.time() * 1000)
    record = db.run(
        """
        MATCH (u:User {id: $user_id})
        CREATE (p:Preference {
            id: $id,
            text: $text,
            scope: $scope,
            role_id: $role_id,
            created_at: $created_at
        })
        CREATE (u)-[:HAS_PREFERENCE]->(p)
        RETURN p
        """,
        user_id=user_id,
        id=pref_id,
        text=text,
        scope=data.scope,
        # Neo4j stores empty string for "applies to all roles" so property
        # comparisons in RAG retrieval stay simple (no null-vs-empty branching).
        role_id=data.role_id or "",
        created_at=created_at,
    ).single()
    if not record:
        raise HTTPException(status_code=404, detail="User not found")
    return _row_to_out(record["p"])


@router.put("/{pref_id}", response_model=PreferenceOut)
def update_preference(
    pref_id: str,
    data: PreferenceUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    # Build a SET clause only for fields the client actually sent.
    updates: dict[str, object] = {}
    if data.text is not None:
        text = data.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Preference text cannot be empty")
        updates["text"] = text
    if data.scope is not None:
        updates["scope"] = data.scope
    if data.role_id is not None:
        updates["role_id"] = data.role_id  # may be "" to broaden scope

    if not updates:
        # Nothing to change; still return current state to be idempotent.
        record = db.run(
            """
            MATCH (u:User {id: $user_id})-[:HAS_PREFERENCE]->(p:Preference {id: $pref_id})
            RETURN p
            """,
            user_id=user_id,
            pref_id=pref_id,
        ).single()
        if not record:
            raise HTTPException(status_code=404, detail="Preference not found")
        return _row_to_out(record["p"])

    set_clause = ", ".join(f"p.{k} = ${k}" for k in updates)
    record = db.run(
        f"""
        MATCH (u:User {{id: $user_id}})-[:HAS_PREFERENCE]->(p:Preference {{id: $pref_id}})
        SET {set_clause}
        RETURN p
        """,
        user_id=user_id,
        pref_id=pref_id,
        **updates,
    ).single()
    if not record:
        raise HTTPException(status_code=404, detail="Preference not found")
    return _row_to_out(record["p"])


@router.delete("/{pref_id}", status_code=204)
def delete_preference(
    pref_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:HAS_PREFERENCE]->(p:Preference {id: $pref_id})
        DETACH DELETE p
        RETURN count(*) AS n
        """,
        user_id=user_id,
        pref_id=pref_id,
    ).single()
    if not result or result["n"] == 0:
        raise HTTPException(status_code=404, detail="Preference not found")
