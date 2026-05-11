import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Any
from neo4j import Session

from database import get_db
from auth.jwt import decode_token
from services.graph_sync import sync_user_from_json

router = APIRouter(prefix="/user-data", tags=["user-data"])
bearer = HTTPBearer()


class UserDataUpdate(BaseModel):
    roles: list[Any] = []
    positions: list[Any] = []
    statuses: list[Any] = []
    categories: dict[str, Any] = {}  # keyed by role_id -> [{id, label}]


class UserDataOut(BaseModel):
    roles: list[Any] = []
    positions: list[Any] = []
    statuses: list[Any] = []
    categories: dict[str, Any] = {}


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("/", response_model=UserDataOut)
def get_user_data(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    result = db.run("MATCH (u:User {id: $id}) RETURN u", id=user_id)
    record = result.single()
    if not record:
        raise HTTPException(status_code=404, detail="User not found")

    u = record["u"]
    roles = json.loads(u.get("roles", "[]") or "[]")
    positions = json.loads(u.get("positions", "[]") or "[]")
    statuses = json.loads(u.get("statuses", "[]") or "[]")
    categories = json.loads(u.get("categories", "{}") or "{}")
    return UserDataOut(roles=roles, positions=positions, statuses=statuses, categories=categories)


def _load_user_data(db: Session, user_id: str) -> tuple[dict, list, list, list, dict]:
    """Return (user_node_dict, roles, positions, statuses, categories) for the
    given user, or raise 404. Used by the cascade delete endpoints.
    """
    record = db.run("MATCH (u:User {id: $id}) RETURN u", id=user_id).single()
    if not record:
        raise HTTPException(status_code=404, detail="User not found")
    u = record["u"]
    roles = json.loads(u.get("roles", "[]") or "[]")
    positions = json.loads(u.get("positions", "[]") or "[]")
    statuses = json.loads(u.get("statuses", "[]") or "[]")
    categories = json.loads(u.get("categories", "{}") or "{}")
    return u, roles, positions, statuses, categories


@router.delete("/roles/{role_id}", response_model=UserDataOut)
def delete_role_cascade(
    role_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Delete a role + cascade per policy:
      - role itself
      - all positions where role == role_id
      - all questions with role_id == role_id (and their answers/practices)
      - preferences scoped to that role_id
      - retag stories with role_id == role_id to '' (preserves content)
      - file [:LINKED_TO] edges to the role are auto-removed by DETACH DELETE
        on the :Role node in sync_user_from_json
    """
    user_id = _get_current_user_id(credentials)
    _u, roles, positions, statuses, categories = _load_user_data(db, user_id)

    # Filter JSON arrays.
    new_roles = [r for r in roles if r.get("id") != role_id]
    new_positions = [p for p in positions if p.get("role") != role_id]

    # Cascade graph deletes — do these BEFORE sync_user_from_json so the graph
    # nodes still exist to be matched (DETACH DELETE in sync would otherwise
    # have removed the Role + Positions, which would already break the matches
    # below since Question/Pref/Story key off role_id properties not edges,
    # but doing it here keeps the order explicit and idempotent).
    db.run(
        """
        MATCH (u:User {id: $uid})-[:HAS_QUESTION]->(q:Question {role_id: $role_id})
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
        DETACH DELETE q, a, p
        """,
        uid=user_id,
        role_id=role_id,
    )
    db.run(
        """
        MATCH (u:User {id: $uid})-[:HAS_PREFERENCE]->(pref:Preference {role_id: $role_id})
        DETACH DELETE pref
        """,
        uid=user_id,
        role_id=role_id,
    )
    db.run(
        """
        MATCH (u:User {id: $uid})-[:HAS_STORY]->(s:Story {role_id: $role_id})
        SET s.role_id = ''
        """,
        uid=user_id,
        role_id=role_id,
    )

    # Persist updated JSON + drop categories for this role.
    new_categories = {k: v for k, v in categories.items() if k != role_id}
    db.run(
        """
        MATCH (u:User {id: $user_id})
        SET u.roles = $roles, u.positions = $positions, u.categories = $categories
        """,
        user_id=user_id,
        roles=json.dumps(new_roles),
        positions=json.dumps(new_positions),
        categories=json.dumps(new_categories),
    )

    # Rebuild Role + Position graph nodes from the new JSON. This step also
    # DETACH-DELETEs the now-orphaned :Role and :Position nodes, which cleans
    # up [:LINKED_TO] edges from files automatically.
    sync_user_from_json(db, user_id)

    return UserDataOut(
        roles=new_roles,
        positions=new_positions,
        statuses=statuses,
        categories=new_categories,
    )


@router.delete("/positions/{position_id}", response_model=UserDataOut)
def delete_position_cascade(
    position_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Delete a position + cascade per policy:
      - position itself
      - all questions with position_key == position_id (and their answers/practices)
      - file [:LINKED_TO] edges to the position are auto-removed by DETACH DELETE
        on the :Position node in sync_user_from_json
    Position id is expected in the same form the frontend uses internally
    (e.g. "pos-1234567890" — matches what's stored in u.positions JSON).
    """
    user_id = _get_current_user_id(credentials)
    _u, roles, positions, statuses, categories = _load_user_data(db, user_id)

    new_positions = [p for p in positions if str(p.get("id")) != position_id]

    db.run(
        """
        MATCH (u:User {id: $uid})-[:HAS_QUESTION]->(q:Question {position_key: $pos_id})
        OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
        OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
        DETACH DELETE q, a, p
        """,
        uid=user_id,
        pos_id=position_id,
    )

    db.run(
        """
        MATCH (u:User {id: $user_id})
        SET u.positions = $positions
        """,
        user_id=user_id,
        positions=json.dumps(new_positions),
    )

    sync_user_from_json(db, user_id)

    return UserDataOut(
        roles=roles,
        positions=new_positions,
        statuses=statuses,
        categories=categories,
    )


@router.put("/", response_model=UserDataOut)
def update_user_data(
    data: UserDataUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    result = db.run("MATCH (u:User {id: $id}) RETURN u", id=user_id)
    if not result.single():
        raise HTTPException(status_code=404, detail="User not found")

    db.run(
        """
        MATCH (u:User {id: $user_id})
        SET u.roles = $roles, u.positions = $positions, u.statuses = $statuses, u.categories = $categories
        """,
        user_id=user_id,
        roles=json.dumps(data.roles),
        positions=json.dumps(data.positions),
        statuses=json.dumps(data.statuses),
        categories=json.dumps(data.categories),
    )

    # Mirror roles/positions to graph nodes so RAG can traverse them.
    sync_user_from_json(db, user_id)

    return UserDataOut(
        roles=data.roles,
        positions=data.positions,
        statuses=data.statuses,
        categories=data.categories,
    )
