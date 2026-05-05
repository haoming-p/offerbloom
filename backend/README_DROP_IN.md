# OfferBloom Backend Drop-in: Document Extraction + KG Generation

This package is reshaped to match the current `backend/` layout in:

```text
haoming-p/offerbloom/backend
```

Current backend shape:

```text
backend/
  main.py
  database.py
  storage.py
  config.py
  routers/
  models/
  auth/
```

So this zip contains files that can be copied directly into `backend/` without replacing `main.py`, `database.py`, or `storage.py`.

## What this adds

```text
routers/documents.py
routers/kg.py
routers/crew.py

services/db_utils.py
services/document_service.py
services/extraction_service.py
services/kg_service.py
services/crew_service.py

utils/document_parser.py
utils/text_cleaner.py
utils/text_chunker.py

kg/document_kg_schema.cypher
scripts/init_document_kg_schema.py

requirements_document_kg_additions.txt
MAIN_PATCH.md
```

## Do not overwrite

Do not overwrite these existing files:

```text
backend/main.py
backend/database.py
backend/storage.py
backend/config.py
```

## Copy into backend

From repo root:

```bash
unzip offerbloom_backend_document_kg_dropin.zip -d /tmp/offerbloom_document_kg

cp -r /tmp/offerbloom_document_kg/routers/* backend/routers/
cp -r /tmp/offerbloom_document_kg/services backend/
cp -r /tmp/offerbloom_document_kg/utils backend/
cp -r /tmp/offerbloom_document_kg/kg backend/
cp -r /tmp/offerbloom_document_kg/scripts backend/
```

Then patch `backend/main.py` using `MAIN_PATCH.md`.

## Add requirements

Append these to `backend/requirements.txt`:

```text
PyMuPDF>=1.24.0
python-docx>=1.1.0
```

## Initialize Neo4j schema

```bash
cd backend
python scripts/init_document_kg_schema.py
```

## Endpoints added

```text
POST /documents/upload
POST /documents/{document_id}/parse
POST /documents/{document_id}/chunk
POST /documents/{document_id}/extract
POST /documents/{document_id}/process

GET  /documents
GET  /documents/{document_id}
GET  /documents/{document_id}/chunks
GET  /documents/{document_id}/extractions

GET  /kg/summary
GET  /kg/entities
GET  /kg/triples

GET  /crew/pending
GET  /crew/handoff/{document_version_id}
POST /crew/runs
POST /crew/runs/{run_id}/complete
```

## Test flow

```bash
curl -X POST "http://localhost:8000/documents/upload" \
  -F "file=@resume.pdf" \
  -F "source_type=resume" \
  -F "user_id=dev-user"

curl -X POST "http://localhost:8000/documents/DOCUMENT_ID/process"

curl "http://localhost:8000/crew/handoff/VERSION_ID"
```
