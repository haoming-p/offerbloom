from services.db_utils import execute_read


def list_entities(entity_type: str | None = None, limit: int = 100) -> list[dict]:
    if entity_type:
        rows = execute_read(
            """
            MATCH (e:ExtractedEntity {entity_type: $entity_type})
            RETURN e { .* } AS entity
            ORDER BY e.confidence DESC
            LIMIT $limit
            """,
            {"entity_type": entity_type, "limit": limit},
        )
    else:
        rows = execute_read(
            """
            MATCH (e:ExtractedEntity)
            RETURN e { .* } AS entity
            ORDER BY e.confidence DESC
            LIMIT $limit
            """,
            {"limit": limit},
        )
    return [row["entity"] for row in rows]


def list_triples(status: str | None = None, limit: int = 100) -> list[dict]:
    if status:
        rows = execute_read(
            """
            MATCH (t:ExtractedTriple {status: $status})
            RETURN t { .* } AS triple
            ORDER BY t.confidence DESC
            LIMIT $limit
            """,
            {"status": status, "limit": limit},
        )
    else:
        rows = execute_read(
            """
            MATCH (t:ExtractedTriple)
            RETURN t { .* } AS triple
            ORDER BY t.confidence DESC
            LIMIT $limit
            """,
            {"limit": limit},
        )
    return [row["triple"] for row in rows]


def graph_summary() -> dict:
    rows = execute_read(
        """
        CALL {
          MATCH (d:Document) RETURN count(d) AS documents
        }
        CALL {
          MATCH (v:DocumentVersion) RETURN count(v) AS versions
        }
        CALL {
          MATCH (c:DocumentChunk) RETURN count(c) AS chunks
        }
        CALL {
          MATCH (e:ExtractedEntity) RETURN count(e) AS entities
        }
        CALL {
          MATCH (t:ExtractedTriple) RETURN count(t) AS triples
        }
        RETURN documents, versions, chunks, entities, triples
        """
    )
    return rows[0] if rows else {}
