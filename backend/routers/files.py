import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from neo4j import Session

from database import get_db
from models.file import FileOut, FileLink
from auth.jwt import decode_token
from storage import upload_file, delete_file
from services.text_extract import extract_text

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


def _fetch_links_for_file(db: Session, file_id: str) -> list[FileLink]:
    """Get all role/position nodes this file is linked to."""
    rows = db.run(
        """
        MATCH (f:File {id: $file_id})-[:LINKED_TO]->(target)
        WHERE target:Role OR target:Position
        RETURN labels(target) AS labels,
               target.id AS id,
               coalesce(target.label, target.title, '') AS label
        """,
        file_id=file_id,
    ).data()
    out: list[FileLink] = []
    for row in rows:
        kind = "role" if "Role" in row["labels"] else "position"
        out.append(FileLink(kind=kind, id=row["id"], label=row["label"]))
    return out


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

    # Extract text content for RAG retrieval. Failures are silent — file still uploads.
    text_content = extract_text(file_bytes, file.content_type)

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
            uploaded_at: $uploaded_at,
            text_content: $text_content
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
        text_content=text_content,
    )

    return FileOut(
        id=file_id,
        name=file.filename,
        file_type=file_type,
        content_type=file.content_type,
        size=size,
        url=public_url,
        uploaded_at=uploaded_at,
        links=[],
    )


@router.get("/", response_model=list[FileOut])
def list_files(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)

    rows = db.run(
        """
        MATCH (u:User {id: $user_id})-[:OWNS]->(f:File)
        OPTIONAL MATCH (f)-[:LINKED_TO]->(target)
        WHERE target:Role OR target:Position
        WITH f, collect(
            CASE WHEN target IS NULL THEN null
            ELSE {
                kind: CASE WHEN 'Role' IN labels(target) THEN 'role' ELSE 'position' END,
                id: target.id,
                label: coalesce(target.label, target.title, '')
            } END
        ) AS raw_links
        RETURN f, [l IN raw_links WHERE l IS NOT NULL] AS links
        ORDER BY f.uploaded_at DESC
        """,
        user_id=user_id,
    ).data()

    return [
        FileOut(
            id=row["f"]["id"],
            name=row["f"]["name"],
            file_type=row["f"]["file_type"],
            content_type=row["f"]["content_type"],
            size=row["f"]["size"],
            url=row["f"]["url"],
            uploaded_at=row["f"]["uploaded_at"],
            links=[FileLink(**l) for l in row["links"]],
        )
        for row in rows
    ]


class LinksUpdate(BaseModel):
    role_ids: list[str] = []
    position_ids: list[str] = []


@router.put("/{file_id}/links", response_model=list[FileLink])
def update_file_links(
    file_id: str,
    payload: LinksUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Replace this file's role/position links with the given sets.

    Validates that every target id belongs to the same user, so a user can't link
    a file to someone else's role/position.
    """
    user_id = _get_current_user_id(credentials)

    owned = db.run(
        "MATCH (u:User {id: $user_id})-[:OWNS]->(f:File {id: $file_id}) RETURN f.id AS id",
        user_id=user_id,
        file_id=file_id,
    ).single()
    if not owned:
        raise HTTPException(status_code=404, detail="File not found")

    # Drop existing links, then re-create only those owned by this user.
    db.run(
        "MATCH (f:File {id: $file_id})-[r:LINKED_TO]->() DELETE r",
        file_id=file_id,
    )

    if payload.role_ids:
        db.run(
            """
            MATCH (f:File {id: $file_id})
            UNWIND $ids AS rid
            MATCH (u:User {id: $user_id})-[:HAS_ROLE]->(r:Role {id: rid})
            MERGE (f)-[:LINKED_TO]->(r)
            """,
            file_id=file_id,
            ids=payload.role_ids,
            user_id=user_id,
        )

    if payload.position_ids:
        db.run(
            """
            MATCH (f:File {id: $file_id})
            UNWIND $ids AS pid
            MATCH (u:User {id: $user_id})-[:HAS_POSITION]->(p:Position {id: pid})
            MERGE (f)-[:LINKED_TO]->(p)
            """,
            file_id=file_id,
            ids=payload.position_ids,
            user_id=user_id,
        )

    return _fetch_links_for_file(db, file_id)


@router.get("/{file_id}/links", response_model=list[FileLink])
def get_file_links(
    file_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = _get_current_user_id(credentials)
    owned = db.run(
        "MATCH (u:User {id: $user_id})-[:OWNS]->(f:File {id: $file_id}) RETURN f.id AS id",
        user_id=user_id,
        file_id=file_id,
    ).single()
    if not owned:
        raise HTTPException(status_code=404, detail="File not found")
    return _fetch_links_for_file(db, file_id)


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
