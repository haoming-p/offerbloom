from typing import Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.crew_service import pending_documents, crew_handoff, create_crew_run, complete_crew_run

router = APIRouter(prefix="/crew", tags=["crew"])


class CompleteRunIn(BaseModel):
    status: str = "completed"
    accepted_triples: list[dict[str, Any]] = []
    rejected_triple_ids: list[str] = []
    notes: str | None = None


@router.get("/pending")
def pending(limit: int = Query(default=25, ge=1, le=100)):
    return pending_documents(limit=limit)


@router.get("/handoff/{document_version_id}")
def handoff(document_version_id: str):
    try:
        return crew_handoff(document_version_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Document version not found")


@router.post("/runs")
def start_run(document_version_id: str, model: str | None = None):
    try:
        return create_crew_run(document_version_id, model=model)
    except ValueError:
        raise HTTPException(status_code=404, detail="Document version not found")


@router.post("/runs/{run_id}/complete")
def complete(run_id: str, payload: CompleteRunIn):
    try:
        return complete_crew_run(run_id, payload)
    except ValueError:
        raise HTTPException(status_code=404, detail="Crew run not found")
