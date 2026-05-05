from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
from fastapi import UploadFile
import hashlib

from storage import upload_file
from services.db_utils import execute_read, execute_write
from services.extraction_service import extract_entities, build_user_triples, label_for_entity_type
from utils.document_parser import extract_text_from_file
from utils.text_cleaner import clean_text
from utils.text_chunker import chunk_text


LOCAL_UPLOAD_ROOT = Path("storage/uploads")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_user(user_id: str) -> None:
    execute_write(
        """
        MERGE (u:User {id: $user_id})
        ON CREATE SET u.created_at = $created_at
        """,
        {"user_id": user_id, "created_at": now_iso()},
    )


def detect_file_type(file_name: str) -> str:
    return Path(file_name).suffix.lower().strip(".") or "unknown"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save_local_copy(file_bytes: bytes, user_id: str, file_name: str) -> Path:
    safe_name = file_name.replace("/", "_").replace("\\", "_")
    path = LOCAL_UPLOAD_ROOT / user_id / f"{uuid4()}_{safe_name}"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(file_bytes)
    return path


async def upload_document(file: UploadFile, user_id: str, source_type: str) -> dict:
    ensure_user(user_id)

    file_name = file.filename or "upload"
    file_type = detect_file_type(file_name)
    file_bytes = await file.read()
    digest = sha256_bytes(file_bytes)

    local_path = save_local_copy(file_bytes, user_id, file_name)
    r2_key = f"documents/{user_id}/{uuid4()}_{file_name}"

    try:
        storage_uri = upload_file(
            file_bytes=file_bytes,
            key=r2_key,
            content_type=file.content_type or "application/octet-stream",
        )
        storage_provider = "r2"
    except Exception:
        # Keeps dev working even when R2 env vars are not configured.
        storage_uri = f"local://{local_path.as_posix()}"
        storage_provider = "local"

    document_id = str(uuid4())
    timestamp = now_iso()

    rows = execute_write(
        """
        MATCH (u:User {id: $user_id})
        CREATE (d:Document {
          id: $document_id,
          user_id: $user_id,
          file_name: $file_name,
          file_type: $file_type,
          source_type: $source_type,
          storage_uri: $storage_uri,
          storage_provider: $storage_provider,
          local_path: $local_path,
          sha256: $sha256,
          status: 'uploaded',
          created_at: $created_at,
          updated_at: $created_at
        })
        CREATE (u)-[:UPLOADED]->(d)
        RETURN d { .* } AS document
        """,
        {
            "user_id": user_id,
            "document_id": document_id,
            "file_name": file_name,
            "file_type": file_type,
            "source_type": source_type,
            "storage_uri": storage_uri,
            "storage_provider": storage_provider,
            "local_path": local_path.as_posix(),
            "sha256": digest,
            "created_at": timestamp,
        },
    )
    return rows[0]["document"]


def list_documents(user_id: str | None = None) -> list[dict]:
    if user_id:
        rows = execute_read(
            """
            MATCH (:User {id: $user_id})-[:UPLOADED]->(d:Document)
            RETURN d { .* } AS document
            ORDER BY d.created_at DESC
            """,
            {"user_id": user_id},
        )
    else:
        rows = execute_read(
            """
            MATCH (d:Document)
            RETURN d { .* } AS document
            ORDER BY d.created_at DESC
            """
        )
    return [row["document"] for row in rows]


def get_document(document_id: str) -> dict:
    rows = execute_read(
        """
        MATCH (d:Document {id: $document_id})
        OPTIONAL MATCH (d)-[:HAS_VERSION]->(v:DocumentVersion)
        RETURN d { .*, versions: collect(v { .id, .status, .parser, .parser_version, .created_at }) } AS document
        """,
        {"document_id": document_id},
    )
    if not rows:
        raise ValueError("Document not found")
    return rows[0]["document"]


def parse_document(document_id: str) -> dict:
    rows = execute_read(
        "MATCH (d:Document {id: $document_id}) RETURN d { .* } AS document",
        {"document_id": document_id},
    )
    if not rows:
        raise ValueError("Document not found")

    document = rows[0]["document"]
    local_path = Path(document["local_path"])

    raw_text, parser_name, parser_version = extract_text_from_file(local_path, document["file_type"])
    cleaned = clean_text(raw_text)

    version_id = str(uuid4())
    timestamp = now_iso()

    rows = execute_write(
        """
        MATCH (d:Document {id: $document_id})
        CREATE (v:DocumentVersion {
          id: $version_id,
          document_id: $document_id,
          raw_text: $raw_text,
          clean_text: $clean_text,
          parser: $parser,
          parser_version: $parser_version,
          status: 'parsed',
          created_at: $created_at,
          updated_at: $created_at
        })
        CREATE (d)-[:HAS_VERSION]->(v)
        SET d.status = 'parsed', d.updated_at = $created_at
        RETURN v { .* } AS version
        """,
        {
            "document_id": document_id,
            "version_id": version_id,
            "raw_text": raw_text,
            "clean_text": cleaned,
            "parser": parser_name,
            "parser_version": parser_version,
            "created_at": timestamp,
        },
    )
    return rows[0]["version"]


def get_latest_version(document_id: str) -> dict:
    rows = execute_read(
        """
        MATCH (:Document {id: $document_id})-[:HAS_VERSION]->(v:DocumentVersion)
        RETURN v { .* } AS version
        ORDER BY v.created_at DESC
        LIMIT 1
        """,
        {"document_id": document_id},
    )
    if not rows:
        raise ValueError("Document has no parsed version")
    return rows[0]["version"]


def get_version(version_id: str) -> dict:
    rows = execute_read(
        "MATCH (v:DocumentVersion {id: $version_id}) RETURN v { .* } AS version",
        {"version_id": version_id},
    )
    if not rows:
        raise ValueError("Document version not found")
    return rows[0]["version"]


def chunk_document(document_id: str, version_id: str | None = None) -> list[dict]:
    version = get_latest_version(document_id) if version_id is None else get_version(version_id)
    chunks = chunk_text(version.get("clean_text") or "")
    timestamp = now_iso()

    execute_write(
        """
        MATCH (v:DocumentVersion {id: $version_id})-[:HAS_CHUNK]->(c:DocumentChunk)
        DETACH DELETE c
        """,
        {"version_id": version["id"]},
    )

    created = []
    for chunk in chunks:
        chunk_id = str(uuid4())
        rows = execute_write(
            """
            MATCH (v:DocumentVersion {id: $version_id})
            CREATE (c:DocumentChunk {
              id: $chunk_id,
              document_version_id: $version_id,
              chunk_index: $chunk_index,
              text: $text,
              token_count: $token_count,
              char_start: $char_start,
              char_end: $char_end,
              created_at: $created_at
            })
            CREATE (v)-[:HAS_CHUNK]->(c)
            RETURN c { .* } AS chunk
            """,
            {
                "version_id": version["id"],
                "chunk_id": chunk_id,
                "chunk_index": chunk.index,
                "text": chunk.text,
                "token_count": chunk.token_count,
                "char_start": chunk.char_start,
                "char_end": chunk.char_end,
                "created_at": timestamp,
            },
        )
        created.append(rows[0]["chunk"])

    execute_write(
        """
        MATCH (v:DocumentVersion {id: $version_id})<-[:HAS_VERSION]-(d:Document)
        SET v.status = 'chunked',
            v.updated_at = $updated_at,
            d.status = 'chunked',
            d.updated_at = $updated_at
        """,
        {"version_id": version["id"], "updated_at": timestamp},
    )

    return created


def get_chunks(document_id: str) -> list[dict]:
    rows = execute_read(
        """
        MATCH (:Document {id: $document_id})-[:HAS_VERSION]->(v:DocumentVersion)-[:HAS_CHUNK]->(c:DocumentChunk)
        RETURN c { .* } AS chunk
        ORDER BY v.created_at DESC, c.chunk_index ASC
        """,
        {"document_id": document_id},
    )
    return [row["chunk"] for row in rows]


def get_chunks_for_version(version_id: str) -> list[dict]:
    rows = execute_read(
        """
        MATCH (:DocumentVersion {id: $version_id})-[:HAS_CHUNK]->(c:DocumentChunk)
        RETURN c { .* } AS chunk
        ORDER BY c.chunk_index ASC
        """,
        {"version_id": version_id},
    )
    return [row["chunk"] for row in rows]


def extract_document(document_id: str, version_id: str | None = None, run_type: str = "initial_heuristic") -> dict:
    version = get_latest_version(document_id) if version_id is None else get_version(version_id)
    timestamp = now_iso()
    run_id = str(uuid4())

    execute_write(
        """
        MATCH (v:DocumentVersion {id: $version_id})
        CREATE (r:ExtractionRun {
          id: $run_id,
          document_version_id: $version_id,
          run_type: $run_type,
          model: null,
          status: 'running',
          started_at: $started_at,
          completed_at: null,
          error: null
        })
        CREATE (v)-[:HAS_EXTRACTION_RUN]->(r)
        """,
        {
            "version_id": version["id"],
            "run_id": run_id,
            "run_type": run_type,
            "started_at": timestamp,
        },
    )

    try:
        chunks = get_chunks_for_version(version["id"])
        if not chunks:
            chunks = chunk_document(document_id, version["id"])

        all_entities_by_key = {}
        chunk_entity_links: list[tuple[str, str]] = []

        for chunk in chunks:
            entities = extract_entities(chunk["text"])
            for entity in entities:
                key = (entity.entity_type, entity.normalized_text)
                all_entities_by_key[key] = entity
                chunk_entity_links.append((chunk["id"], f"{entity.entity_type}:{entity.normalized_text}"))

        entity_id_by_key_string: dict[str, str] = {}

        for entity in all_entities_by_key.values():
            entity_id = str(uuid4())
            key_string = f"{entity.entity_type}:{entity.normalized_text}"
            execute_write(
                """
                MATCH (r:ExtractionRun {id: $run_id})
                CREATE (e:ExtractedEntity {
                  id: $entity_id,
                  text: $text,
                  entity_type: $entity_type,
                  normalized_text: $normalized_text,
                  confidence: $confidence,
                  source: $source
                })
                CREATE (r)-[:FOUND_ENTITY]->(e)
                RETURN e.id AS id
                """,
                {
                    "run_id": run_id,
                    "entity_id": entity_id,
                    "text": entity.text,
                    "entity_type": entity.entity_type,
                    "normalized_text": entity.normalized_text,
                    "confidence": entity.confidence,
                    "source": entity.source,
                },
            )
            entity_id_by_key_string[key_string] = entity_id
            normalize_entity(entity_id)

        for chunk_id, key_string in chunk_entity_links:
            entity_id = entity_id_by_key_string.get(key_string)
            if entity_id:
                execute_write(
                    """
                    MATCH (c:DocumentChunk {id: $chunk_id})
                    MATCH (e:ExtractedEntity {id: $entity_id})
                    MERGE (c)-[:EVIDENCE_FOR]->(e)
                    """,
                    {"chunk_id": chunk_id, "entity_id": entity_id},
                )

        triples = build_user_triples("User", all_entities_by_key.values())
        for triple in triples:
            triple_id = str(uuid4())
            execute_write(
                """
                MATCH (r:ExtractionRun {id: $run_id})
                CREATE (t:ExtractedTriple {
                  id: $triple_id,
                  subject_text: $subject_text,
                  predicate: $predicate,
                  object_text: $object_text,
                  confidence: $confidence,
                  status: $status
                })
                CREATE (r)-[:FOUND_TRIPLE]->(t)
                """,
                {
                    "run_id": run_id,
                    "triple_id": triple_id,
                    "subject_text": triple.subject_text,
                    "predicate": triple.predicate,
                    "object_text": triple.object_text,
                    "confidence": triple.confidence,
                    "status": triple.status,
                },
            )

        completed_at = now_iso()
        rows = execute_write(
            """
            MATCH (r:ExtractionRun {id: $run_id})<-[:HAS_EXTRACTION_RUN]-(v:DocumentVersion)<-[:HAS_VERSION]-(d:Document)
            SET r.status = 'completed',
                r.completed_at = $completed_at,
                v.status = 'extracted',
                v.updated_at = $completed_at,
                d.status = 'crew_pending',
                d.updated_at = $completed_at
            RETURN r { .* } AS run
            """,
            {"run_id": run_id, "completed_at": completed_at},
        )
        return rows[0]["run"]

    except Exception as exc:
        execute_write(
            """
            MATCH (r:ExtractionRun {id: $run_id})
            SET r.status = 'failed',
                r.completed_at = $completed_at,
                r.error = $error
            """,
            {"run_id": run_id, "completed_at": now_iso(), "error": str(exc)},
        )
        raise


def normalize_entity(entity_id: str) -> None:
    rows = execute_read(
        """
        MATCH (e:ExtractedEntity {id: $entity_id})
        RETURN e.entity_type AS entity_type,
               e.text AS text,
               e.normalized_text AS normalized_text
        """,
        {"entity_id": entity_id},
    )
    if not rows:
        return

    label = label_for_entity_type(rows[0]["entity_type"])
    if label is None:
        return

    query = f"""
    MATCH (e:ExtractedEntity {{id: $entity_id}})
    MERGE (n:{label} {{normalized_name: $normalized_text}})
    ON CREATE SET n.name = $text, n.created_at = $created_at
    MERGE (e)-[:NORMALIZED_TO]->(n)
    """
    execute_write(
        query,
        {
            "entity_id": entity_id,
            "normalized_text": rows[0]["normalized_text"],
            "text": rows[0]["text"],
            "created_at": now_iso(),
        },
    )


def get_extractions(document_id: str) -> dict:
    rows = execute_read(
        """
        MATCH (:Document {id: $document_id})-[:HAS_VERSION]->(v:DocumentVersion)
        OPTIONAL MATCH (v)-[:HAS_EXTRACTION_RUN]->(r:ExtractionRun)
        OPTIONAL MATCH (r)-[:FOUND_ENTITY]->(e:ExtractedEntity)
        OPTIONAL MATCH (r)-[:FOUND_TRIPLE]->(t:ExtractedTriple)
        RETURN
          collect(DISTINCT r { .* }) AS runs,
          collect(DISTINCT e { .* }) AS entities,
          collect(DISTINCT t { .* }) AS triples
        """,
        {"document_id": document_id},
    )
    if not rows:
        return {"runs": [], "entities": [], "triples": []}
    return rows[0]


def process_document(document_id: str) -> dict:
    document = get_document(document_id)
    version = parse_document(document_id)
    chunks = chunk_document(document_id, version["id"])
    run = extract_document(document_id, version["id"])
    return {
        "document": document,
        "version": version,
        "chunks_created": len(chunks),
        "extraction_run": run,
    }
