from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel
from typing import Any

from services.document_service import (
    upload_document,
    list_documents,
    get_document,
    parse_document,
    chunk_document,
    extract_document,
    get_chunks,
    get_extractions,
    process_document,
)

router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentOut(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_type: str
    source_type: str
    storage_uri: str
    sha256: str
    status: str
    created_at: str


class DocumentVersionOut(BaseModel):
    id: str
    document_id: str
    raw_text: str | None = None
    clean_text: str | None = None
    parser: str | None = None
    parser_version: str | None = None
    status: str
    created_at: str


class DocumentChunkOut(BaseModel):
    id: str
    chunk_index: int
    text: str
    token_count: int
    char_start: int
    char_end: int
    created_at: str


class ProcessDocumentOut(BaseModel):
    document: dict[str, Any]
    version: dict[str, Any]
    chunks_created: int
    extraction_run: dict[str, Any]


@router.post("/upload", response_model=DocumentOut)
async def upload(
    file: UploadFile = File(...),
    source_type: str = Form("unknown"),
    user_id: str = Form("dev-user"),
):
    return await upload_document(file=file, user_id=user_id, source_type=source_type)


@router.get("")
def list_all(user_id: str | None = Query(default=None)):
    return list_documents(user_id=user_id)


@router.get("/{document_id}")
def read_one(document_id: str):
    try:
        return get_document(document_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.post("/{document_id}/parse", response_model=DocumentVersionOut)
def parse(document_id: str):
    try:
        return parse_document(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/{document_id}/chunk", response_model=list[DocumentChunkOut])
def chunk(document_id: str):
    try:
        return chunk_document(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/{document_id}/extract")
def extract(document_id: str):
    try:
        return extract_document(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/{document_id}/process", response_model=ProcessDocumentOut)
def process(document_id: str):
    try:
        return process_document(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{document_id}/chunks", response_model=list[DocumentChunkOut])
def chunks(document_id: str):
    return get_chunks(document_id)


@router.get("/{document_id}/extractions")
def extractions(document_id: str):
    return get_extractions(document_id)
