from typing import Literal, Optional
from pydantic import BaseModel


Scope = Literal["prep", "files", "all"]


class PreferenceOut(BaseModel):
    id: str
    text: str
    scope: Scope
    role_id: Optional[str] = None
    created_at: int


class PreferenceCreate(BaseModel):
    text: str
    scope: Scope = "all"
    role_id: Optional[str] = None


class PreferenceUpdate(BaseModel):
    text: Optional[str] = None
    scope: Optional[Scope] = None
    role_id: Optional[str] = None
