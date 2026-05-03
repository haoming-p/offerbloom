from pydantic import BaseModel
from typing import Any


class PracticeOut(BaseModel):
    id: str
    tag: str
    duration: int
    transcript: str
    ai_feedback: Any = None
    created_at: int


class PracticeCreate(BaseModel):
    question_id: str
    tag: str
    duration: int
    transcript: str = ""
