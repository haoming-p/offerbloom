from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from services.db_utils import execute_write


def strip_block_comments(text: str) -> str:
    while "/*" in text and "*/" in text:
        start = text.index("/*")
        end = text.index("*/", start) + 2
        text = text[:start] + text[end:]
    return text


def main():
    schema_path = Path(__file__).resolve().parents[1] / "kg" / "document_kg_schema.cypher"
    text = strip_block_comments(schema_path.read_text())
    statements = [s.strip() for s in text.split(";") if s.strip()]

    for statement in statements:
        execute_write(statement)

    print(f"Applied {len(statements)} document KG schema statements.")


if __name__ == "__main__":
    main()
