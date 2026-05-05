from pydantic import BaseModel
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.answer import AnswerOut


class QuestionOut(BaseModel):
    id: str
    text: str
    role_id: str
    category_id: str
    position_key: str
    order: int
    difficulty: str = ""
    experience: str = ""
    ideal_answer: str = ""
    answers: list = []


class QuestionCreate(BaseModel):
    role_id: str
    category_id: str
    position_key: str = "general"
    text: str
