#!/usr/bin/env python3
"""Replace the old 8 behavioral category tags with per-role defaults.

Old: every role had Leadership / Team Collab / Conflict Resolution / Adaptability /
     Culture Fit / Motivation / Work Style / Career Goals.
New: per-role defaults (PM = bq + product_sense + general; SDE = bq + algorithm +
     system_design; PJM = bq; everything else = empty).

Two writes per user:
  1. Overwrite User.categories JSON with new per-role defaults.
  2. Re-tag any :Question whose category_id is in the old behavioral set → 'bq'.

Idempotent — safe to re-run. Use --dry-run to preview.
"""

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv()
from neo4j import GraphDatabase


DEFAULTS_BY_ROLE = {
    "pm": [
        {"id": "bq",            "label": "BQ"},
        {"id": "product_sense", "label": "Product Sense"},
        {"id": "general",       "label": "General"},
    ],
    "sde": [
        {"id": "bq",            "label": "BQ"},
        {"id": "algorithm",     "label": "Algorithm"},
        {"id": "system_design", "label": "System Design"},
    ],
    "pjm": [
        {"id": "bq",            "label": "BQ"},
    ],
}

OLD_BEHAVIORAL_IDS = {
    "leadership", "team_collaboration", "conflict_resolution", "adaptability",
    "culture_fit", "motivation", "work_style", "career_goals",
}


def build_user_categories(user_roles_json: str) -> dict:
    """Compute new categories dict for a user given their roles JSON."""
    try:
        roles = json.loads(user_roles_json or "[]")
    except (TypeError, json.JSONDecodeError):
        roles = []
    return {r["id"]: DEFAULTS_BY_ROLE.get(r["id"], []) for r in roles if r.get("id")}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--uri", default=os.environ.get("NEO4J_URI", "bolt://localhost:7687"))
    ap.add_argument("--user", default=os.environ.get("NEO4J_USER", "neo4j"))
    ap.add_argument("--password", default=os.environ.get("NEO4J_PASSWORD", "password"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    driver = GraphDatabase.driver(
        args.uri, auth=(args.user, args.password),
        notifications_disabled_categories=["UNRECOGNIZED"],
    )

    try:
        with driver.session() as s:
            users = s.run("MATCH (u:User) RETURN u.id AS id, u.email AS email, u.roles AS roles").data()
            print(f"Found {len(users)} user(s)\n")

            for u in users:
                new_cats = build_user_categories(u["roles"])
                tag = f"{u['email']:50}"
                summary = ", ".join(f"{k}={len(v)}" for k, v in new_cats.items()) or "(no roles)"
                print(f"  {tag} → {summary}")
                if not args.dry_run:
                    s.run(
                        "MATCH (u:User {id: $id}) SET u.categories = $cats",
                        id=u["id"], cats=json.dumps(new_cats),
                    )

            # Re-tag questions: old behavioral category_ids → 'bq'.
            count_q = s.run(
                """
                MATCH (q:Question)
                WHERE q.category_id IN $old_ids
                RETURN count(q) AS n
                """,
                old_ids=list(OLD_BEHAVIORAL_IDS),
            ).single()["n"]
            print(f"\nQuestions with old category_id: {count_q}")

            if not args.dry_run and count_q > 0:
                s.run(
                    """
                    MATCH (q:Question)
                    WHERE q.category_id IN $old_ids
                    SET q.category_id = 'bq'
                    """,
                    old_ids=list(OLD_BEHAVIORAL_IDS),
                )
                print(f"  → re-tagged {count_q} question(s) to 'bq'")

            if args.dry_run:
                print("\n[dry-run] No changes written.")
            else:
                print("\n✅ Done.")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
