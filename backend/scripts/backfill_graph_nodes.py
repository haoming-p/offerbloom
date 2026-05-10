#!/usr/bin/env python3
"""One-time backfill: read every user's JSON roles/positions and create graph nodes.

Run after deploying graph_sync.py changes. Idempotent — safe to re-run, since
sync_user_from_json drops orphaned nodes and re-creates the rest from JSON.

USAGE
-----
From the project root:

    cd backend
    ./venv/bin/python scripts/backfill_graph_nodes.py

By default uses the local Neo4j config from backend/.env. Override with --uri,
--user, --password if you want to run against a different database (e.g. AuraDB).
"""

import argparse
import sys
from pathlib import Path

# Add backend/ to path so we can import services without installing the package
sys.path.insert(0, str(Path(__file__).parent.parent))

from neo4j import GraphDatabase
from services.graph_sync import sync_user_from_json


DEFAULT_URI = "bolt://localhost:7687"
DEFAULT_USER = "neo4j"
DEFAULT_PASSWORD = "password"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--uri", default=DEFAULT_URI)
    parser.add_argument("--user", default=DEFAULT_USER)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    driver = GraphDatabase.driver(
        args.uri,
        auth=(args.user, args.password),
        notifications_disabled_categories=["UNRECOGNIZED"],
    )

    try:
        with driver.session() as session:
            users = session.run(
                "MATCH (u:User) RETURN u.id AS id, u.email AS email"
            ).data()

            print(f"Found {len(users)} users\n")
            total_roles = 0
            total_positions = 0

            for record in users:
                uid = record["id"]
                email = record["email"]
                if args.dry_run:
                    print(f"  [dry-run] would sync {email}")
                    continue
                summary = sync_user_from_json(session, uid)
                print(
                    f"  ✓ {email}  →  {summary['roles']} role(s), {summary['positions']} position(s)"
                )
                total_roles += summary["roles"]
                total_positions += summary["positions"]

            if not args.dry_run:
                print(
                    f"\nTotal: {total_roles} :Role nodes + {total_positions} :Position nodes mirrored to graph."
                )
    finally:
        driver.close()


if __name__ == "__main__":
    main()
