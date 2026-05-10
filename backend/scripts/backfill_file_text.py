#!/usr/bin/env python3
"""One-time backfill: download each :File from R2 and extract text_content.

Phase B added text extraction at upload time, but every File node created
before Phase B has no text_content — which means RAG retrieval skips them
even when linked. This script fixes that.

USAGE
-----
From the backend directory:

    ./venv/bin/python scripts/backfill_file_text.py

Defaults to local Neo4j + R2 from backend/.env. Use --dry-run to preview.
Skips files that already have text_content (idempotent).
"""

import argparse
import sys
from pathlib import Path

# Add backend/ to path so we can import services without installing the package
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import os
from neo4j import GraphDatabase
from services.text_extract import extract_text
from storage import download_file


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="List files but don't extract or write")
    parser.add_argument("--force", action="store_true", help="Re-extract even if text_content already present")
    args = parser.parse_args()

    driver = GraphDatabase.driver(
        os.environ["NEO4J_URI"],
        auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]),
        notifications_disabled_categories=["UNRECOGNIZED"],
    )

    try:
        with driver.session() as s:
            files = s.run(
                """
                MATCH (u:User)-[:OWNS]->(f:File)
                RETURN f.id AS id,
                       f.name AS name,
                       f.r2_key AS key,
                       f.content_type AS content_type,
                       size(coalesce(f.text_content, '')) AS existing_chars,
                       u.email AS owner
                ORDER BY u.email, f.name
                """
            ).data()

            print(f"Found {len(files)} File node(s) total\n")
            updated = 0
            skipped = 0
            failed = 0

            for f in files:
                tag = f"{f['owner'][:30]:30}  {f['name']:40}"
                if f["existing_chars"] > 0 and not args.force:
                    print(f"  skip (has text) {tag}")
                    skipped += 1
                    continue

                if args.dry_run:
                    print(f"  [dry-run] would extract {tag}")
                    continue

                try:
                    data = download_file(f["key"])
                except Exception as e:
                    print(f"  FAIL R2 fetch {tag}  ({e})")
                    failed += 1
                    continue

                text = extract_text(data, f["content_type"])
                if not text:
                    print(f"  FAIL no text  {tag}  ({len(data)} bytes, {f['content_type']})")
                    failed += 1
                    continue

                s.run(
                    "MATCH (f:File {id: $id}) SET f.text_content = $text",
                    id=f["id"],
                    text=text,
                )
                print(f"  ✓ {len(text):>6} chars  {tag}")
                updated += 1

            print(f"\nDone. updated={updated}  skipped={skipped}  failed={failed}")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
