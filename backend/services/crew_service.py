from datetime import datetime, timezone
from uuid import uuid4
from services.db_utils import execute_read, execute_write


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def pending_documents(limit: int = 25) -> list[dict]:
    rows = execute_read(
        """
        MATCH (d:Document)-[:HAS_VERSION]->(v:DocumentVersion)
        WHERE d.status = 'crew_pending' OR v.status = 'extracted'
        RETURN d { .*, latest_version_id: v.id } AS document
        ORDER BY d.updated_at DESC
        LIMIT $limit
        """,
        {"limit": limit},
    )
    return [row["document"] for row in rows]


def crew_handoff(document_version_id: str) -> dict:
    rows = execute_read(
        """
        MATCH (d:Document)-[:HAS_VERSION]->(v:DocumentVersion {id: $version_id})
        OPTIONAL MATCH (v)-[:HAS_CHUNK]->(c:DocumentChunk)
        OPTIONAL MATCH (v)-[:HAS_EXTRACTION_RUN]->(r:ExtractionRun)
        OPTIONAL MATCH (r)-[:FOUND_ENTITY]->(e:ExtractedEntity)
        OPTIONAL MATCH (r)-[:FOUND_TRIPLE]->(t:ExtractedTriple)
        RETURN
          d.id AS document_id,
          v.id AS document_version_id,
          d.source_type AS source_type,
          d.file_name AS file_name,
          v.clean_text AS clean_text,
          collect(DISTINCT c { .id, .chunk_index, .text, .char_start, .char_end, .token_count }) AS chunks,
          collect(DISTINCT e { .id, .text, .entity_type, .normalized_text, .confidence, .source }) AS entities,
          collect(DISTINCT t { .id, .subject_text, .predicate, .object_text, .confidence, .status }) AS triples
        """,
        {"version_id": document_version_id},
    )

    if not rows:
        raise ValueError("Document version not found")

    row = rows[0]
    return {
        "document_id": row["document_id"],
        "document_version_id": row["document_version_id"],
        "source_type": row["source_type"],
        "file_name": row["file_name"],
        "clean_text": row["clean_text"] or "",
        "chunks": sorted([c for c in row["chunks"] if c.get("id")], key=lambda c: c["chunk_index"]),
        "existing_entities": [e for e in row["entities"] if e.get("id")],
        "existing_triples": [t for t in row["triples"] if t.get("id")],
    }


def create_crew_run(document_version_id: str, model: str | None = None) -> dict:
    run_id = str(uuid4())
    rows = execute_write(
        """
        MATCH (v:DocumentVersion {id: $version_id})
        CREATE (r:ExtractionRun {
          id: $run_id,
          document_version_id: $version_id,
          run_type: 'crewai_kg_extraction',
          model: $model,
          status: 'running',
          started_at: $started_at,
          completed_at: null,
          error: null
        })
        CREATE (v)-[:HAS_EXTRACTION_RUN]->(r)
        SET v.status = 'crew_processing'
        RETURN r { .* } AS run
        """,
        {
            "version_id": document_version_id,
            "run_id": run_id,
            "model": model,
            "started_at": now_iso(),
        },
    )
    if not rows:
        raise ValueError("Document version not found")
    return rows[0]["run"]


def complete_crew_run(run_id: str, payload) -> dict:
    timestamp = now_iso()

    for triple in payload.accepted_triples:
        triple_id = triple.get("id") or str(uuid4())
        execute_write(
            """
            MATCH (r:ExtractionRun {id: $run_id})
            MERGE (t:ExtractedTriple {id: $triple_id})
            SET t.subject_text = $subject_text,
                t.predicate = $predicate,
                t.object_text = $object_text,
                t.confidence = $confidence,
                t.status = 'accepted',
                t.updated_at = $updated_at
            MERGE (r)-[:FOUND_TRIPLE]->(t)
            """,
            {
                "run_id": run_id,
                "triple_id": triple_id,
                "subject_text": triple.get("subject_text", "User"),
                "predicate": triple.get("predicate", "RELATED_TO"),
                "object_text": triple.get("object_text", ""),
                "confidence": float(triple.get("confidence", 0.9)),
                "updated_at": timestamp,
            },
        )

    if payload.rejected_triple_ids:
        execute_write(
            """
            MATCH (t:ExtractedTriple)
            WHERE t.id IN $ids
            SET t.status = 'rejected',
                t.updated_at = $updated_at
            """,
            {"ids": payload.rejected_triple_ids, "updated_at": timestamp},
        )

    rows = execute_write(
        """
        MATCH (r:ExtractionRun {id: $run_id})<-[:HAS_EXTRACTION_RUN]-(v:DocumentVersion)<-[:HAS_VERSION]-(d:Document)
        SET r.status = $status,
            r.completed_at = $completed_at,
            r.notes = $notes,
            v.status = CASE WHEN $status = 'completed' THEN 'crew_validated' ELSE v.status END,
            d.status = CASE WHEN $status = 'completed' THEN 'crew_validated' ELSE d.status END,
            v.updated_at = $completed_at,
            d.updated_at = $completed_at
        RETURN r { .* } AS run
        """,
        {
            "run_id": run_id,
            "status": payload.status,
            "completed_at": timestamp,
            "notes": payload.notes,
        },
    )
    if not rows:
        raise ValueError("Crew run not found")
    return rows[0]["run"]
