"""Extract plain text from uploaded files for RAG retrieval.

Strategy:
  - PDF  → pdfplumber (page-by-page text extraction; ~95% accurate for resumes)
  - TXT  → decode UTF-8 with replacement for invalid bytes
  - DOCX → zip + regex on word/document.xml (no python-docx dep)

Failures are silent — we return "" rather than raising. Files keep their R2
metadata even if text extraction fails; the AI just won't have searchable text
for that file. Logged on stderr for debugging.
"""

import io
import re
import sys
import zipfile

MAX_TEXT_CHARS = 60_000  # 60k chars ≈ 30+ pages, plenty for a resume

PDF_MIME = "application/pdf"
TXT_MIME = "text/plain"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def extract_pdf(data: bytes) -> str:
    try:
        import pdfplumber
        text_parts: list[str] = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                text_parts.append(page.extract_text() or "")
        return "\n\n".join(text_parts).strip()
    except Exception as e:
        print(f"[text_extract] PDF extraction failed: {e}", file=sys.stderr)
        return ""


def extract_txt(data: bytes) -> str:
    try:
        return data.decode("utf-8", errors="replace").strip()
    except Exception as e:
        print(f"[text_extract] TXT decode failed: {e}", file=sys.stderr)
        return ""


def extract_docx(data: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            xml = z.read("word/document.xml").decode("utf-8", errors="replace")
        text = re.sub(r"<[^>]+>", " ", xml)
        text = re.sub(r"\s+", " ", text).strip()
        return text
    except Exception as e:
        print(f"[text_extract] DOCX extraction failed: {e}", file=sys.stderr)
        return ""


def extract_text(data: bytes, content_type: str) -> str:
    """Dispatch to the right extractor and cap length."""
    if content_type == PDF_MIME:
        text = extract_pdf(data)
    elif content_type == TXT_MIME:
        text = extract_txt(data)
    elif content_type == DOCX_MIME:
        text = extract_docx(data)
    else:
        text = ""
    return text[:MAX_TEXT_CHARS]
