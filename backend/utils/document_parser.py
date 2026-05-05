from pathlib import Path
import fitz
import docx


class UnsupportedDocumentType(Exception):
    pass


def extract_text_from_file(path: str | Path, file_type: str) -> tuple[str, str, str]:
    path = Path(path)
    normalized = file_type.lower().strip(". ")

    if normalized == "pdf":
        parser_version = getattr(fitz, "version", ("unknown",))[0]
        return extract_pdf_text(path), "pymupdf", parser_version

    if normalized in {"docx", "doc"}:
        return extract_docx_text(path), "python-docx", "unknown"

    if normalized in {"txt", "md"}:
        return path.read_text(encoding="utf-8", errors="ignore"), "plain-text", "builtin"

    raise UnsupportedDocumentType(f"Unsupported file type: {file_type}")


def extract_pdf_text(path: Path) -> str:
    parts: list[str] = []
    with fitz.open(path) as pdf:
        for page_num, page in enumerate(pdf, start=1):
            text = page.get_text("text")
            if text.strip():
                parts.append(f"\n\n[PAGE {page_num}]\n{text}")
    return "\n".join(parts).strip()


def extract_docx_text(path: Path) -> str:
    document = docx.Document(path)
    paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()
