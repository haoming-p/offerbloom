from typing import Optional
from pydantic import BaseModel


class StoryOut(BaseModel):
    id: str
    title: str
    content: str  # TipTap HTML (same shape as Answer.content)
    role_id: Optional[str] = None  # null = applies to all roles
    created_at: int
    updated_at: int


class StoryCreate(BaseModel):
    title: str
    content: str = ""
    role_id: Optional[str] = None


class StoryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    role_id: Optional[str] = None
