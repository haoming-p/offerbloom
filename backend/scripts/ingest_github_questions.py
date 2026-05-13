"""Ingest interview questions from public GitHub markdown repos into the
PreloadedQuestion pool.

USAGE
    # Inside backend container or with backend/.env loaded:
    python -m scripts.ingest_github_questions --list
    python -m scripts.ingest_github_questions --source react --dry-run
    python -m scripts.ingest_github_questions --source react --write

Sources are MIT or CC-BY licensed and the script stores `source` +
`source_url` + `source_license` on each node so attribution survives in DB.
MERGE keyed on a deterministic id derived from source + question text;
re-running is idempotent.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
import urllib.request
from dataclasses import dataclass, field
from typing import Callable, Iterable


# ---------------------------------------------------------------------------
# Parsed-question record
# ---------------------------------------------------------------------------

@dataclass
class ParsedQuestion:
    text: str
    role_id: str
    category_id: str
    difficulty: str = ""
    ideal_answer: str = ""
    source: str = ""
    source_url: str = ""
    source_license: str = ""

    def stable_id(self) -> str:
        seed = f"{self.source}|{self.role_id}|{self.text}".encode("utf-8")
        return "gh_" + hashlib.sha1(seed).hexdigest()[:14]


# ---------------------------------------------------------------------------
# Parsers
# ---------------------------------------------------------------------------

def _slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")
    return s or "general"


def parse_react_md(
    md: str,
    role_id: str,
    section_to_category: dict[str, str],
    default_category: str,
    source: str,
    source_url: str,
    source_license: str,
) -> list[ParsedQuestion]:
    """H3 question heading + paragraph answer, H2 section header.

    Format (sudheerj/reactjs-interview-questions):
        ## Core React
        1.  ### What is React?

            <answer paragraph(s)>

            **[⬆ Back to Top](#table-of-contents)**
        2.  ### Next question?
            ...
    """
    h2_re = re.compile(r"^##\s+(.+?)\s*$")
    h3_q_re = re.compile(r"^\s*(?:\d+\.\s+)?###\s+(.+?)\s*$")

    results: list[ParsedQuestion] = []
    current_section = ""
    current_q: str | None = None
    answer_lines: list[str] = []

    def flush():
        nonlocal current_q, answer_lines
        if current_q is None:
            return
        text = re.sub(r"^\d+\.\s*", "", current_q).strip()
        answer = "\n".join(answer_lines).strip()
        # Strip "Back to Top" links and collapsed details
        answer = re.sub(r"\*\*\[.\sBack to Top\].*?\*\*", "", answer).strip()
        answer = re.sub(r"<details>.*?</details>", "", answer, flags=re.S).strip()
        cat = section_to_category.get(current_section.lower(), default_category)
        results.append(ParsedQuestion(
            text=text,
            role_id=role_id,
            category_id=cat,
            ideal_answer=answer[:2000],
            source=source,
            source_url=source_url,
            source_license=source_license,
        ))
        current_q, answer_lines[:] = None, []

    for raw in md.splitlines():
        line = raw.rstrip()
        m2 = h2_re.match(line)
        if m2 and "###" not in line:
            flush()
            current_section = m2.group(1).strip()
            continue
        m3 = h3_q_re.match(line)
        if m3:
            flush()
            current_q = m3.group(1).strip()
            continue
        if current_q is not None:
            answer_lines.append(line)

    flush()
    # Skip TOC entries (which would have empty answers) and require a "?"
    return [q for q in results if q.text and "?" in q.text and q.ideal_answer]


def parse_ds_bold(
    md: str,
    role_id: str,
    section_to_category: dict[str, str],
    default_category: str,
    source: str,
    source_url: str,
    source_license: str,
) -> list[ParsedQuestion]:
    """Bold-paragraph questions with emoji difficulty, sectioned by H2.

    Format (alexeygrigorev/data-science-interviews/theory.md):
        ## Supervised machine learning
        **What is supervised machine learning? 👶**
        <answer paragraphs>
    """
    DIFF = {"👶": "Easy", "⭐": "Medium", "⭐️": "Medium", "🚀": "Hard"}
    results: list[ParsedQuestion] = []
    current_section = ""
    current_q: str | None = None
    current_diff = ""
    answer_lines: list[str] = []

    bold_q_re = re.compile(r"^\s*\*\*(.+?)\*\*\s*$")

    def flush():
        nonlocal current_q, current_diff, answer_lines
        if current_q is None:
            return
        text = current_q
        # Pull difficulty emoji out of the question text
        for emoji, label in DIFF.items():
            if emoji in text:
                current_diff = label
                text = text.replace(emoji, "").strip()
        answer = "\n".join(answer_lines).strip()
        cat = section_to_category.get(current_section.lower(), default_category)
        results.append(ParsedQuestion(
            text=text,
            role_id=role_id,
            category_id=cat,
            difficulty=current_diff,
            ideal_answer=answer[:2000],
            source=source,
            source_url=source_url,
            source_license=source_license,
        ))
        current_q, current_diff, answer_lines[:] = None, "", []

    for raw in md.splitlines():
        line = raw.rstrip()
        if line.startswith("## "):
            flush()
            current_section = line[3:].strip()
            continue
        m = bold_q_re.match(line)
        if m and ("?" in m.group(1) or any(e in m.group(1) for e in DIFF)):
            flush()
            current_q = m.group(1).strip()
            continue
        if current_q is not None:
            answer_lines.append(line)

    flush()
    return [q for q in results if q.text and "?" in q.text]


# ---------------------------------------------------------------------------
# Source registry
# ---------------------------------------------------------------------------

@dataclass
class Source:
    name: str
    url: str
    role_id: str
    default_category: str
    license: str
    parser: Callable[..., list[ParsedQuestion]]
    section_to_category: dict[str, str] = field(default_factory=dict)


SOURCES: dict[str, Source] = {
    "react": Source(
        name="react",
        url="https://raw.githubusercontent.com/sudheerj/reactjs-interview-questions/master/README.md",
        role_id="sde",
        default_category="frontend",
        license="MIT",
        parser=parse_react_md,
        section_to_category={
            "core react": "frontend",
            "react router": "frontend",
            "react internationalization": "frontend",
            "react testing": "frontend",
            "react redux": "frontend",
            "react native": "frontend",
            "hooks": "frontend",
        },
    ),
    "ds-theory": Source(
        name="ds-theory",
        url="https://raw.githubusercontent.com/alexeygrigorev/data-science-interviews/master/theory.md",
        role_id="ds",
        default_category="ml_theory",
        license="CC-BY-4.0",
        parser=parse_ds_bold,
        section_to_category={
            "supervised machine learning": "ml_theory",
            "linear regression": "ml_theory",
            "validation": "ml_theory",
            "classification": "ml_theory",
            "regularization": "ml_theory",
            "feature selection": "ml_theory",
            "decision trees": "ml_theory",
            "random forest": "ml_theory",
            "gradient boosting": "ml_theory",
            "neural networks": "ml_theory",
            "clustering": "ml_theory",
            "dimensionality reduction": "ml_theory",
            "text classification": "nlp",
            "ranking and search": "ml_theory",
            "recommender systems": "ml_theory",
            "time series": "ml_theory",
        },
    ),
}


# ---------------------------------------------------------------------------
# IO + driver
# ---------------------------------------------------------------------------

def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "offerbloom-ingest/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def run_source(src: Source) -> list[ParsedQuestion]:
    md = fetch(src.url)
    return src.parser(
        md,
        role_id=src.role_id,
        section_to_category=src.section_to_category,
        default_category=src.default_category,
        source=src.name,
        source_url=src.url,
        source_license=src.license,
    )


def print_summary(qs: list[ParsedQuestion], sample: int = 10) -> None:
    by_cat: dict[str, int] = {}
    for q in qs:
        by_cat[q.category_id] = by_cat.get(q.category_id, 0) + 1
    print(f"  total parsed: {len(qs)}")
    for cat, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"    {cat}: {n}")
    print(f"\n  -- first {sample} samples --")
    for q in qs[:sample]:
        ans = (q.ideal_answer[:120] + "…") if len(q.ideal_answer) > 120 else q.ideal_answer
        ans = ans.replace("\n", " ")
        diff = f" [{q.difficulty}]" if q.difficulty else ""
        print(f"  • ({q.category_id}){diff} {q.text}")
        if ans:
            print(f"      → {ans}")


def write_to_neo4j(qs: list[ParsedQuestion]) -> tuple[int, int]:
    """MERGE each question into the PreloadedQuestion pool. Idempotent."""
    # Lazy-import so --dry-run works without DB config.
    import sys as _sys
    import os as _os
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
    from database import driver  # type: ignore

    created = updated = 0
    with driver.session() as s:
        for q in qs:
            res = s.run(
                """
                MERGE (p:PreloadedQuestion {id: $id})
                ON CREATE SET
                  p.text = $text,
                  p.role_id = $role_id,
                  p.category_id = $category_id,
                  p.difficulty = $difficulty,
                  p.experience = '',
                  p.ideal_answer = $ideal_answer,
                  p.keywords = [],
                  p.source = $source,
                  p.source_url = $source_url,
                  p.source_license = $source_license,
                  p.created_at = timestamp(),
                  p.was_created = true
                ON MATCH SET
                  p.text = $text,
                  p.category_id = $category_id,
                  p.difficulty = $difficulty,
                  p.ideal_answer = $ideal_answer,
                  p.source = $source,
                  p.source_url = $source_url,
                  p.source_license = $source_license,
                  p.updated_at = timestamp(),
                  p.was_created = false
                RETURN p.was_created AS was_created
                """,
                id=q.stable_id(),
                text=q.text,
                role_id=q.role_id,
                category_id=q.category_id,
                difficulty=q.difficulty,
                ideal_answer=q.ideal_answer,
                source=q.source,
                source_url=q.source_url,
                source_license=q.source_license,
            ).single()
            if res and res["was_created"]:
                created += 1
            else:
                updated += 1
    return created, updated


def main() -> int:
    p = argparse.ArgumentParser(description="Ingest interview Qs from GitHub markdown.")
    p.add_argument("--list", action="store_true", help="List available sources and exit.")
    p.add_argument("--source", help="Source name (see --list). Default: all.")
    p.add_argument("--dry-run", action="store_true", help="Parse and print; do not write to Neo4j.")
    p.add_argument("--write", action="store_true", help="MERGE parsed questions into Neo4j.")
    p.add_argument("--sample", type=int, default=10, help="How many sample Qs to print.")
    args = p.parse_args()

    if args.list:
        for s in SOURCES.values():
            print(f"  {s.name:12s}  role={s.role_id:4s}  license={s.license:10s}  {s.url}")
        return 0

    if not args.dry_run and not args.write:
        print("Specify --dry-run or --write.", file=sys.stderr)
        return 2

    targets: Iterable[Source]
    if args.source:
        if args.source not in SOURCES:
            print(f"Unknown source: {args.source}. Use --list.", file=sys.stderr)
            return 2
        targets = [SOURCES[args.source]]
    else:
        targets = SOURCES.values()

    grand_created = grand_updated = 0
    for src in targets:
        print(f"\n=== {src.name} ({src.url}) ===")
        try:
            qs = run_source(src)
        except Exception as e:
            print(f"  FAILED: {e}", file=sys.stderr)
            continue
        print_summary(qs, sample=args.sample)
        if args.write:
            c, u = write_to_neo4j(qs)
            grand_created += c
            grand_updated += u
            print(f"  wrote to Neo4j: created={c}  updated={u}")

    if args.write:
        print(f"\nTOTAL: created={grand_created}  updated={grand_updated}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
