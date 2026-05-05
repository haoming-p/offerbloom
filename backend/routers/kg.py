from fastapi import APIRouter, Query
from services.kg_service import list_entities, list_triples, graph_summary

router = APIRouter(prefix="/kg", tags=["kg"])


@router.get("/summary")
def summary():
    return graph_summary()


@router.get("/entities")
def entities(
    entity_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
):
    return list_entities(entity_type=entity_type, limit=limit)


@router.get("/triples")
def triples(
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
):
    return list_triples(status=status, limit=limit)
