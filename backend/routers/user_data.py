import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Any
from neo4j import Session

from database import get_db
from auth.jwt import decode_token

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
    return UserDataOut(
        roles=data.roles,
        positions=data.positions,
        statuses=data.statuses,
        categories=data.categories,
    )
