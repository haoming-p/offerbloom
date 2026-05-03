import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Any
from neo4j import Session

from database import get_db
from auth.jwt import decode_token

router = APIRouter(prefix="/onboarding", tags=["onboarding"])
bearer = HTTPBearer()


class OnboardingData(BaseModel):
    roles: list[Any] = []
    positions: list[Any] = []


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/save", status_code=200)
def save_onboarding(
    data: OnboardingData,
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
        SET u.roles = $roles, u.positions = $positions, u.onboarded = true
        """,
        user_id=user_id,
        roles=json.dumps(data.roles),
        positions=json.dumps(data.positions),
    )

    return {"status": "ok"}
