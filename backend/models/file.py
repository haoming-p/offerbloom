from pydantic import BaseModel


class FileOut(BaseModel):
    id: str
    name: str
    file_type: str       # "resume" | "cover_letter" | "job_description" | "other"
    content_type: str    # MIME type, e.g. "application/pdf"
    size: int            # bytes
    url: str
    uploaded_at: str

