from pydantic import BaseModel


class AnswerOut(BaseModel):
    id: str
    label: str
    content: str


class AnswerCreate(BaseModel):
    question_id: str
    label: str
    content: str


class AnswerUpdate(BaseModel):
    label: str
    content: str
