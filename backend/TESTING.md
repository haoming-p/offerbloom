# Manual test from inside `backend/`

## 1. Install additions

```bash
pip install PyMuPDF python-docx
```

## 2. Initialize schema

```bash
python scripts/init_document_kg_schema.py
```

## 3. Start backend

```bash
uvicorn main:app --reload --port 8000
```

## 4. Upload document

```bash
curl -X POST "http://localhost:8000/documents/upload" \
  -F "file=@resume.pdf" \
  -F "source_type=resume" \
  -F "user_id=dev-user"
```

## 5. Process document

```bash
curl -X POST "http://localhost:8000/documents/DOCUMENT_ID/process"
```

## 6. Get Crew handoff

```bash
curl "http://localhost:8000/crew/handoff/VERSION_ID"
```

## 7. View KG summary

```bash
curl "http://localhost:8000/kg/summary"
```
