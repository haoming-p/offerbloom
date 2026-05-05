from dataclasses import dataclass
from utils.text_cleaner import estimate_token_count


@dataclass
class TextChunk:
    index: int
    text: str
    char_start: int
    char_end: int
    token_count: int


def chunk_text(text: str, chunk_size: int = 1800, overlap: int = 250) -> list[TextChunk]:
    clean = text.strip()
    if not clean:
        return []

    chunks: list[TextChunk] = []
    start = 0
    index = 0

    while start < len(clean):
        end = min(start + chunk_size, len(clean))

        if end < len(clean):
            boundary = max(clean.rfind("\n", start, end), clean.rfind(". ", start, end))
            if boundary > start + int(chunk_size * 0.55):
                end = boundary + 1

        chunk = clean[start:end].strip()
        if chunk:
            chunks.append(
                TextChunk(
                    index=index,
                    text=chunk,
                    char_start=start,
                    char_end=end,
                    token_count=estimate_token_count(chunk),
                )
            )
            index += 1

        if end >= len(clean):
            break

        start = max(0, end - overlap)

    return chunks
