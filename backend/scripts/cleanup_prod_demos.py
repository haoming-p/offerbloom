#!/usr/bin/env python3
"""One-shot cleanup of :DemoGuest accounts on prod AuraDB (or any Neo4j).

Deletes ALL :DemoGuest user nodes plus every node they own, across the full
schema (newer node types like :Story / :Preference are included, unlike the
24h cron helper in services/demo.py).

USAGE
-----
    ./venv/bin/python scripts/cleanup_prod_demos.py \\
      --uri "neo4j+s://YOUR_INSTANCE.databases.neo4j.io" \\
      --user "YOUR_INSTANCE_ID" \\
      --password "YOUR_AURA_PASSWORD"

Flags:
  --ttl-hours N   Only delete guests older than N hours. Default 0 = all.
  --dry-run       Print counts, don't delete.
  --yes           Skip the confirm prompt.
"""

import argparse
import sys
from neo4j import GraphDatabase


COUNT_QUERY = """
MATCH (g:DemoGuest)
WHERE $ttl = 0 OR g.created_at < datetime() - duration({hours: $ttl})
OPTIONAL MATCH (g)-[:HAS_QUESTION]->(q:Question)
OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
OPTIONAL MATCH (g)-[:OWNS]->(f:File)
OPTIONAL MATCH (g)-[:HAS_ROLE]->(r:Role)
OPTIONAL MATCH (g)-[:HAS_POSITION]->(pos:Position)
OPTIONAL MATCH (g)-[:HAS_CHAT]->(cs:ChatSession)
OPTIONAL MATCH (cs)-[:HAS_MESSAGE]->(m:Message)
OPTIONAL MATCH (g)-[:HAS_PREFERENCE]->(pref:Preference)
OPTIONAL MATCH (g)-[:HAS_STORY]->(st:Story)
RETURN
  count(DISTINCT g)   AS guests,
  count(DISTINCT q)   AS questions,
  count(DISTINCT a)   AS answers,
  count(DISTINCT p)   AS practices,
  count(DISTINCT f)   AS files,
  count(DISTINCT r)   AS roles,
  count(DISTINCT pos) AS positions,
  count(DISTINCT cs)  AS sessions,
  count(DISTINCT m)   AS messages,
  count(DISTINCT pref) AS preferences,
  count(DISTINCT st)  AS stories
"""

DELETE_QUERY = """
MATCH (g:DemoGuest)
WHERE $ttl = 0 OR g.created_at < datetime() - duration({hours: $ttl})
OPTIONAL MATCH (g)-[:HAS_QUESTION]->(q:Question)
OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
OPTIONAL MATCH (g)-[:OWNS]->(f:File)
OPTIONAL MATCH (g)-[:HAS_ROLE]->(r:Role)
OPTIONAL MATCH (g)-[:HAS_POSITION]->(pos:Position)
OPTIONAL MATCH (g)-[:HAS_CHAT]->(cs:ChatSession)
OPTIONAL MATCH (cs)-[:HAS_MESSAGE]->(m:Message)
OPTIONAL MATCH (g)-[:HAS_PREFERENCE]->(pref:Preference)
OPTIONAL MATCH (g)-[:HAS_STORY]->(st:Story)
DETACH DELETE g, q, a, p, f, r, pos, cs, m, pref, st
"""


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--uri", required=True)
    ap.add_argument("--user", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--ttl-hours", type=int, default=0,
                    help="Only delete guests older than N hours. Default 0 = all.")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--yes", action="store_true")
    args = ap.parse_args()

    driver = GraphDatabase.driver(
        args.uri,
        auth=(args.user, args.password),
        notifications_disabled_categories=["UNRECOGNIZED"],
    )
    try:
        with driver.session() as s:
            row = s.run(COUNT_QUERY, ttl=args.ttl_hours).single()

        if not row or row["guests"] == 0:
            print("✅ No demo guests match — nothing to delete.")
            return

        scope = "all" if args.ttl_hours == 0 else f"older than {args.ttl_hours}h"
        print(f"📊 Demo guests matching ({scope}):")
        for k in ("guests", "questions", "answers", "practices", "files",
                  "roles", "positions", "sessions", "messages", "preferences", "stories"):
            print(f"   {k:<13} {row[k]}")

        if args.dry_run:
            print("\n[dry-run] No changes written.")
            return

        if not args.yes:
            confirm = input("\nDelete all of the above? [y/N]: ").strip().lower()
            if confirm != "y":
                print("Aborted.")
                return

        with driver.session() as s:
            result = s.run(DELETE_QUERY, ttl=args.ttl_hours)
            counters = result.consume().counters

        print(f"\n✅ Deleted {counters.nodes_deleted} nodes "
              f"and {counters.relationships_deleted} relationships.")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
