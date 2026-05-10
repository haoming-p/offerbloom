from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from neo4j import Session

from config import settings
from database import get_db
from models.user import UserOut, TokenResponse
from auth.jwt import create_access_token, decode_token
from services.demo import (
    create_demo_guest,
    clone_user_data,
    delete_user_and_data,
    delete_old_guests,
)

router = APIRouter(prefix="/demo", tags=["demo"])
bearer = HTTPBearer()


class SaveToAccountBody(BaseModel):
    guest_token: str


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _verify_demo_guest(db: Session, user_id: str) -> None:
    """Raise 403 if user is not a :DemoGuest."""
    record = db.run(
        "MATCH (u:User {id: $id}) RETURN 'DemoGuest' IN labels(u) AS is_guest",
        id=user_id,
    ).single()
    if not record:
        raise HTTPException(status_code=404, detail="User not found")
    if not record["is_guest"]:
        raise HTTPException(status_code=403, detail="Demo guest only")


@router.post("/reset", response_model=TokenResponse)
def reset_demo(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Delete the current guest entirely and create a fresh one. Returns the new guest's JWT.
    Frontend should replace the saved token with the new one and reload."""
    user_id = _get_current_user_id(credentials)
    _verify_demo_guest(db, user_id)

    if not settings.demo_user_email:
        raise HTTPException(status_code=503, detail="Demo not configured")

    delete_user_and_data(db, user_id)

    try:
        guest = create_demo_guest(db, settings.demo_user_email)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    token = create_access_token({"sub": guest["id"], "email": guest["email"]})
    user = UserOut(
        id=guest["id"], name=guest["name"], email=guest["email"], is_demo_guest=True
    )
    return TokenResponse(access_token=token, user=user)


@router.post("/save-to-account", status_code=200)
def save_to_account(
    body: SaveToAccountBody,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Copy a demo guest's data into the currently signed-in user, then delete the guest.
    Auth header must be the NEW user's token; body carries the guest's token."""
    new_user_id = _get_current_user_id(credentials)

    # Decode the guest token to get guest user id
    try:
        guest_payload = decode_token(body.guest_token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid guest token")
    guest_id = guest_payload["sub"]

    # Confirm guest is actually a :DemoGuest (don't migrate from arbitrary accounts)
    _verify_demo_guest(db, guest_id)

    # Confirm target user exists and is NOT a demo guest (avoid double-demo)
    target_record = db.run(
        "MATCH (u:User {id: $id}) RETURN 'DemoGuest' IN labels(u) AS is_guest",
        id=new_user_id,
    ).single()
    if not target_record:
        raise HTTPException(status_code=404, detail="Target user not found")
    if target_record["is_guest"]:
        raise HTTPException(status_code=400, detail="Cannot save to a demo guest account")

    clone_user_data(db, guest_id, new_user_id)
    delete_user_and_data(db, guest_id)

    return {"status": "ok"}


@router.post("/internal/cleanup", status_code=200)
def cleanup_demo_guests(
    x_cleanup_secret: str = Header(default=""),
    ttl_hours: int = 24,
    db: Session = Depends(get_db),
):
    """Internal endpoint, intended to be hit by a scheduled cron job. Deletes :DemoGuest
    nodes (and their owned data) older than ttl_hours. Protected by CLEANUP_SECRET env var."""
    if not settings.cleanup_secret:
        raise HTTPException(status_code=503, detail="Cleanup not configured")
    if x_cleanup_secret != settings.cleanup_secret:
        raise HTTPException(status_code=401, detail="Invalid cleanup secret")

    deleted = delete_old_guests(db, ttl_hours=ttl_hours)
    return {"deleted_nodes": deleted, "ttl_hours": ttl_hours}
