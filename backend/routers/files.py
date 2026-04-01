import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from neo4j import Session

from database import get_db
from models.file import FileOut
from auth.jwt import decode_token
from storage import upload_file, delete_file

router = APIRouter(prefix="/files", tags=["files"])
bearer = HTTPBearer()

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        payload = decode_token(credentials.credentials)
        return payload["sub"]
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/upload", response_model=FileOut)
async def upload(
    file: UploadFile = File(...),
    file_type: str = Form(...),  # "resume" | "cover_letter" | "job_description" | "other"
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="File type not allowed. Use PDF, DOCX, or TXT.")

    file_bytes = await file.read()
    size = len(file_bytes)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    file_id = str(uuid.uuid4())
    key = f"{user_id}/{file_id}/{file.filename}"
    uploaded_at = datetime.now(timezone.utc).isoformat()

    public_url = upload_file(file_bytes, key, file.content_type)

    db.run(
        """
        MATCH (u:User {id: $user_id})
        CREATE (f:File {
            id: $file_id,
            name: $name,
            file_type: $file_type,
            content_type: $content_type,
            size: $size,
            r2_key: $key,
            url: $url,
            uploaded_at: $uploaded_at
        })
        CREATE (u)-[:OWNS]->(f)
        """,
        user_id=user_id,
        file_id=file_id,
        name=file.filename,
        file_type=file_type,
        content_type=file.content_type,
        size=size,
        key=key,
        url=public_url,
        uploaded_at=uploaded_at,
    )

    return FileOut(
        id=file_id,
        name=file.filename,
        file_type=file_type,
        content_type=file.content_type,
        size=size,
        url=public_url,
        uploaded_at=uploaded_at,
    )


@router.get("/", response_model=list[FileOut])
def list_files(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:OWNS]->(f:File)
        RETURN f ORDER BY f.uploaded_at DESC
        """,
        user_id=user_id,
    )

    return [
        FileOut(
            id=record["f"]["id"],
            name=record["f"]["name"],
            file_type=record["f"]["file_type"],
            content_type=record["f"]["content_type"],
            size=record["f"]["size"],
            url=record["f"]["url"],
            uploaded_at=record["f"]["uploaded_at"],
        )
        for record in result
    ]


@router.delete("/{file_id}", status_code=204)
def delete(
    file_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    result = db.run(
        """
        MATCH (u:User {id: $user_id})-[:OWNS]->(f:File {id: $file_id})
        RETURN f.r2_key AS key
        """,
        user_id=user_id,
        file_id=file_id,
    )
    record = result.single()

    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    delete_file(record["key"])

    db.run(
        """
        MATCH (u:User {id: $user_id})-[:OWNS]->(f:File {id: $file_id})
        DETACH DELETE f
        """,
        user_id=user_id,
        file_id=file_id,
    )
